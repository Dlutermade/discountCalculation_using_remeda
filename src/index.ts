import {
  addProp,
  compact,
  concat,
  createPipe,
  flatMap,
  groupBy,
  map,
  mapValues,
  partition,
  pipe,
  prop,
  reduce,
  setPath,
  sumBy,
  values,
} from "remeda";

const Database = {
  products: {
    "001": {
      name: "Cola",
      price: 45,
    },
    "002": {
      name: "Royal",
      price: 50,
    },
    "003": {
      name: "Sprite",
      price: 55,
    },
    "004": {
      name: "Fanta",
      price: 60,
    },
    "005": {
      name: "Lemon Tea",
      price: 35,
    },
  },
};

type IDatabase = {
  products: {
    [key: string]: {
      name: string;
      price: number;
    };
  };
};

const cart = ["003", "002", "003", "003", "004", "006"];

type FormattedOrder = {
  id: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  quantity: number;
  activatedOfCoupon: string[];
};

const groupByCart = (database: IDatabase) =>
  createPipe(
    map(
      (itemId: string) =>
        database.products[itemId] &&
        addProp(database.products[itemId], "id", itemId)
    ),
    compact,
    groupBy(prop("id")),
    mapValues((groupItem) => ({
      id: groupItem[0].id,
      name: groupItem[0].name,
      originalPrice: groupItem[0].price,
      discountedPrice: groupItem[0].price,
      quantity: groupItem.length,
      activatedOfCoupon: [] as string[],
    })),
    values
  );

const couponOne = (orders: FormattedOrder[]) =>
  pipe(
    orders,
    partition((order) => order.quantity >= 2),
    ([canDiscount, cantDiscount]) =>
      pipe(
        canDiscount,
        flatMap((item) =>
          concat(
            [
              pipe(
                item,
                setPath(["quantity"], Math.floor(item.quantity / 2)),
                setPath(
                  ["activatedOfCoupon"],
                  concat(item.activatedOfCoupon, ["CouponOne-notDiscounted"])
                )
              ),
              pipe(
                item,
                setPath(["quantity"], Math.floor(item.quantity / 2)),
                setPath(["discountedPrice"], item.discountedPrice / 2), // 折價 可以連續折價
                setPath(
                  ["activatedOfCoupon"],
                  concat(item.activatedOfCoupon, ["CouponOne-discounted"])
                )
              ),
            ],
            item.quantity % 2 === 0 ? [] : [setPath(item, ["quantity"], 1)]
          )
        ),
        concat(cantDiscount)
      )
  );

const couponTwo = (orders: FormattedOrder[]) =>
  pipe(
    orders,
    reduce(
      (acc, order) =>
        order.activatedOfCoupon.length === 0 ? acc + order.quantity : acc,
      0
    ),
    (total) =>
      total >= 3
        ? pipe(
            orders,
            partition((order) => order.activatedOfCoupon.length === 0),
            ([canDiscount, cantDiscount]) =>
              pipe(
                canDiscount,
                map((order) =>
                  pipe(
                    order,
                    setPath(["discountedPrice"], order.discountedPrice - 5),
                    setPath(
                      ["activatedOfCoupon"],
                      concat(order.activatedOfCoupon, ["CouponTwo"])
                    )
                  )
                ),
                concat(cantDiscount)
              )
          )
        : orders
  );

const applyCoupon = (database: IDatabase) => (cart: string[]) =>
  pipe(cart, groupByCart(database), couponOne, couponTwo);

export const checkout = (database: IDatabase) => (cart: string[]) =>
  pipe(
    cart,
    applyCoupon(database),
    sumBy((order) => order.discountedPrice * order.quantity)
  );
