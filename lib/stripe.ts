// eslint-disable-next-line @typescript-eslint/no-var-requires
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export default stripe;
