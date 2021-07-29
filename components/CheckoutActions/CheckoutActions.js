/* eslint-disable react/no-multi-comp */
import React, { Fragment, Component } from "react";
import PropTypes from "prop-types";
import { isEqual } from "lodash";
import styled from "styled-components";
import Stripe from "stripe";
import Actions from "@reactioncommerce/components/CheckoutActions/v1";
import ShippingAddressCheckoutAction from "@reactioncommerce/components/ShippingAddressCheckoutAction/v1";
import FulfillmentOptionsCheckoutAction from "@reactioncommerce/components/FulfillmentOptionsCheckoutAction/v1";
import PaymentsCheckoutAction from "@reactioncommerce/components/PaymentsCheckoutAction/v1";
import FinalReviewCheckoutAction from "@reactioncommerce/components/FinalReviewCheckoutAction/v1";
import { addTypographyStyles } from "@reactioncommerce/components/utils";
import withAddressValidation from "containers/address/withAddressValidation";
import Dialog from "@material-ui/core/Dialog";
import PageLoading from "components/PageLoading";
import Router from "translations/i18nRouter";
import calculateRemainderDue from "lib/utils/calculateRemainderDue";
import { placeOrderMutation } from "../../hooks/orders/placeOrder.gql";
import { decodeOpaqueId } from "../../lib/utils/decoding";

// import { updateStripeDataToUserCollection } from "../../pages/api/rememberUserCard";

const MessageDiv = styled.div`
  ${addTypographyStyles("NoPaymentMethodsMessage", "bodyText")}
`;

const NoPaymentMethodsMessage = () => (
  <MessageDiv>No payment methods available</MessageDiv>
);

NoPaymentMethodsMessage.renderComplete = () => "";

const stripe = new Stripe(process.env.STRIPE_PUBLIC_API_KEY);

class CheckoutActions extends Component {
  static propTypes = {
    addressValidation: PropTypes.func.isRequired,
    addressValidationResults: PropTypes.object,
    apolloClient: PropTypes.shape({
      mutate: PropTypes.func.isRequired,
    }),
    cart: PropTypes.shape({
      account: PropTypes.object,
      checkout: PropTypes.object,
      email: PropTypes.string,
      items: PropTypes.array,
    }).isRequired,
    cartStore: PropTypes.object,
    checkoutMutations: PropTypes.shape({
      onSetFulfillmentOption: PropTypes.func.isRequired,
      onSetShippingAddress: PropTypes.func.isRequired,
    }),
    clearAuthenticatedUsersCart: PropTypes.func.isRequired,
    orderEmailAddress: PropTypes.string.isRequired,
    paymentMethods: PropTypes.array,
  };

  state = {
    actionAlerts: {
      1: null,
      2: null,
      3: null,
      4: null,
    },
    hasPaymentError: false,
    isPlacingOrder: false,
  };

  componentDidUpdate({
    addressValidationResults: prevAddressValidationResults,
  }) {
    const { addressValidationResults } = this.props;
    if (
      addressValidationResults &&
      prevAddressValidationResults &&
      !isEqual(addressValidationResults, prevAddressValidationResults)
    ) {
      this.handleValidationErrors();
    }
  }

  componentDidMount() {
    this._isMounted = true;

    /** GET Stripe Id from user. If there is no Id, create a customer in Stripe, Get the userId and update the collections with the Id */
    /*
    this.getStripeCustomerId(
      decodeOpaqueId(this.props.cart.account._id).id
    ).then((userStripeId) => {
      if (userStripeId !== undefined) {
        console.log("createCustomer Stripe Id Successful 1 ", userStripeId);
        localStorage.setItem("custID", userStripeId);
      } else {
          localStorage.setItem("custID", "null");        
      }
    }); 

    
    if(localStorage.getItem("custID") == 'null') {
      // localStorage.removeItem("custID");
      this.createCustomer(
        this.props.cart.account.emailRecords[0].address
      ).then((stripeCust) => {
        console.log("createCustomer Stripe Id Successful 2 ", stripeCust.id);
        // this.updateStripeCustomerId(userId, stripeCust.id).then(stripeCust => {

        // });
        localStorage.setItem("custID", stripeCust.id);
      });

      console.log(
        "ComponenDid userStripeCustomerId =====> ",
        localStorage.getItem("custID")
      );
    }

    */

    // If User Id exist, we need to pass the address and card token to the addCheckoutPayment method. 
    /*
    const address = {
      address1: "Test",
      address2: null,
      city: "Test",
      company: null,
      country: "GB",
      fullName: "Test",
      isBillingDefault: false,
      isCommercial: false,
      isShippingDefault: false,
      phone: "123",
      postal: "Test",
      region: "Test",
    };
    this.setShippingAddress(address);

    const testObj = {
      displayName: "Visa ending in 4242",
      payment: {
        amount: null,
        billingAddress: {
          address1: "Test",
          address2: null,
          city: "Test",
          company: null,
          country: "GB",
          fullName: "Test",
          isBillingDefault: false,
          isCommercial: false,
          isShippingDefault: false,
          phone: "123",
          postal: "Test",
          region: "Test",
        },
        data: {
          stripeTokenId: "tok_1JGKjLEBeJD27rVsAJaJ5tMR",
          // stripeTokenId: "tok_1JG1234566tytytytytytyty",
        },
        method: "stripe_card",
      },
    };
    this.props.cartStore.addCheckoutPayment(testObj); */
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  buildData = ({ step, action }) => ({
    action,
    payment_method: this.paymentMethod, // eslint-disable-line camelcase
    shipping_method: this.shippingMethod, // eslint-disable-line camelcase
    step,
  });

  get shippingMethod() {
    const {
      checkout: { fulfillmentGroups },
    } = this.props.cart;
    const { selectedFulfillmentOption } = fulfillmentGroups[0];
    console.log("selectedFulfillmentOption =====> ", selectedFulfillmentOption);
    return selectedFulfillmentOption
      ? selectedFulfillmentOption.fulfillmentMethod.displayName
      : null;
  }

  get paymentMethod() {
    const [firstPayment] = this.props.cartStore.checkoutPayments;
    return firstPayment ? firstPayment.payment.method : null;
  }

  // Storefront API to fetch the user details
  getStripeCustomerId = async (userId) => {
    try {
      const retrieveCustomerId = {
        method: "GET",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      };

      const res = await fetch(
        `${process.env.CANONICAL_URL}/stripeGetUser?userId=${userId}`,
        retrieveCustomerId
      );
      const userDetails = await res.json();
      // if (userDetails.results[0].stripeId === undefined) {
      //   return this.createCustomer(
      //     this.props.cart.account.emailRecords[0].address
      //   ).then((stripeCust) => {
      //     console.log("createCustomer Stripe Id Successful 2 ", stripeCust.id);
      //     // this.updateStripeCustomerId(userId, stripeCust.id).then(stripeCust => {

      //     // });
      //     return stripeCust.id;
      //   });
      // }
        console.log(
          "getCustomer Stripe Id Successful ",
          userDetails.results[0].stripeId
        );
        return userDetails.results[0].stripeId;
    } catch (err) {
      console.log("getCustomer Unable Get Stripe Id", err);
      console.log(err.message);
    }
  };

  // Storefront API to update the stripe Id to user collection.
  updateStripeCustomerId = async (userId, stripeCustId) => {
    try {
      const retrieveCustomerId = {
        method: "GET",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      };

      const res = await fetch(
        `${process.env.CANONICAL_URL}/stripeGetUser?userId=${userId}&stripeId=${stripeCustId}`,
        retrieveCustomerId
      );
      const listOfCustomer = await res.json();
    } catch (err) {
      console.log("getCustomer Unable Get Stripe Id", err);
      console.log(err.message);
    }
  };

  // Stripe API to Create the customer
  createCustomer = async (email) => {
    try {
      const authorization = "Bearer sk_test_H9SqoV84XLwvJDGPRkFiDQa4";
      const retrieveCustomer = {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      };

      const res = await fetch(
        `https://api.stripe.com/v1/customers?description=Our Customer&email=${email}`,
        retrieveCustomer
      );
      const stripeCust = await res.json();
      console.log(
        "createCustomer is successful ====> ",
        stripeCust
      );
      return stripeCust;
    } catch (err) {
      console.log("createCustomer Error", err);
    }
  };

  // Stripe API to Create the customer
  getCustomer = async (customerId) => {
    try {
      const authorization = "Bearer sk_test_H9SqoV84XLwvJDGPRkFiDQa4";
      const retrieveCustomer = {
        method: "GET",
        headers: {
          Authorization: authorization,
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      };

      const res = await fetch(
        `https://api.stripe.com/v1/customers/${customerId}`,
        retrieveCustomer
      );
      const listOfCustomer = await res.json();
      console.log(
        "getCustomer is successful ====> ",
        listOfCustomer
      );
    } catch (err) {
      console.log(err.message);
    }
  };

  setShippingAddress = async (address) => {
    const {
      checkoutMutations: { onSetShippingAddress },
    } = this.props;
    delete address.isValid;
    const { data, error } = await onSetShippingAddress(address);
    if (data && !error && this._isMounted) {
      this.setState({
        actionAlerts: {
          1: {},
        },
      });
    }
  };

  handleValidationErrors() {
    const { addressValidationResults } = this.props;
    const { validationErrors } = addressValidationResults || [];
    const shippingAlert =
      validationErrors && validationErrors.length
        ? {
            alertType: validationErrors[0].type,
            title: validationErrors[0].summary,
            message: validationErrors[0].details,
          }
        : null;
    this.setState({ actionAlerts: { 1: shippingAlert } });
  }

  setShippingMethod = async (shippingMethod) => {
    const {
      checkoutMutations: { onSetFulfillmentOption },
    } = this.props;
    const {
      checkout: { fulfillmentGroups },
    } = this.props.cart;

    const fulfillmentOption = {
      fulfillmentGroupId: fulfillmentGroups[0]._id,
      fulfillmentMethodId:
        shippingMethod.selectedFulfillmentOption.fulfillmentMethod._id,
    };
    await onSetFulfillmentOption(fulfillmentOption);
  };

  handlePaymentSubmit = (paymentInput) => {
    const address = {
      address1: "Test",
      address2: null,
      city: "Test",
      company: null,
      country: "GB",
      fullName: "Test",
      isBillingDefault: false,
      isCommercial: false,
      isShippingDefault: false,
      phone: "123",
      postal: "Test",
      region: "Test",
    };
    // console.log("handlePaymentSubmit =====> ", paymentInput);
    this.setShippingAddress(address);
    this.props.cartStore.addCheckoutPayment(paymentInput);

    this.setState({
      hasPaymentError: false,
      actionAlerts: {
        3: {},
      },
    });
  };

  handlePaymentsReset = () => {
    this.props.cartStore.resetCheckoutPayments();
  };

  buildOrder = async () => {
    const { cart, cartStore, orderEmailAddress } = this.props;
    const cartId = cartStore.hasAccountCart
      ? cartStore.accountCartId
      : cartStore.anonymousCartId;
    const { checkout } = cart;

    const fulfillmentGroups = checkout.fulfillmentGroups.map((group) => {
      const { data } = group;
      const { selectedFulfillmentOption } = group;

      const items = cart.items.map((item) => ({
        addedAt: item.addedAt,
        price: item.price.amount,
        productConfiguration: item.productConfiguration,
        quantity: item.quantity,
      }));

      return {
        data,
        items,
        selectedFulfillmentMethodId: process.env.ENABLE_SHIPPING
          ? selectedFulfillmentOption.fulfillmentMethod._id
          : process.env.DEFAULT_SHIPPING_ID,
        // selectedFulfillmentMethodId: selectedFulfillmentOption.fulfillmentMethod._id,
        shopId: group.shop._id,
        totalPrice: checkout.summary.total.amount,
        type: group.type,
      };
    });

    const order = {
      cartId,
      currencyCode: checkout.summary.total.currency.code,
      email: orderEmailAddress,
      fulfillmentGroups,
      shopId: cart.shop._id,
    };

    return this.setState({ isPlacingOrder: true }, () =>
      this.placeOrder(order)
    );
  };

  placeOrderAtNWS = async function () {
    try {
      const currentQuote = JSON.parse(localStorage.getItem("currentQuote"));
      const authorization =
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjYXRhd29yeCJ9.qb7x10X3T_bBq64Il0UoLMr2gPpqiZsmk48e-6QXuM8";
      let payload = {
        id: currentQuote.id,
        externalId: "productx",
        state: "ACCEPTED",
        quoteChangeStateReason: "User Accepted the Quote",
      };
      const requestOptions = {
        method: "PATCH",
        headers: {
          Authorization: authorization,
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      };

      // const res = await fetch(`http://localhost:8088/api/mef/quoteManagement/quote/requestStateChange`, requestOptions);
      const res = await fetch(
        `http://34.106.29.102:8000/quoteManagement/requestStateChange`,
        requestOptions
      );
      const acceptedQuote = await res.json();
      console.log("Successfully Placed Order", acceptedQuote);
      if (acceptedQuote.data !== undefined) {
        console.log("Place Order at Nokia Success", acceptedQuote.data);
      } else {
        console.log("Place Order at Nokia Failed");
      }
    } catch (err) {
      console.log("Unable place an order at Nokia", err);
      console.log(err.message);
    }
  };

  placeOrder = async (order) => {
    const { cartStore, clearAuthenticatedUsersCart, apolloClient } = this.props;

    // Payments can have `null` amount to mean "remaining".
    let remainingAmountDue = order.fulfillmentGroups.reduce(
      (sum, group) => sum + group.totalPrice,
      0
    );
    const payments = cartStore.checkoutPayments.map(({ payment }) => {
      const amount = payment.amount
        ? Math.min(payment.amount, remainingAmountDue)
        : remainingAmountDue;
      remainingAmountDue -= amount;
      return { ...payment, amount };
    });

    try {
      order.fulfillmentGroups[0].totalPrice =
        order.fulfillmentGroups[0].items.price;
      const { data } = await apolloClient.mutate({
        mutation: placeOrderMutation,
        variables: {
          input: {
            order,
            payments,
          },
        },
      });

      // Placing the order was successful, so we should clear the
      // anonymous cart credentials from cookie since it will be
      // deleted on the server.
      cartStore.clearAnonymousCartCredentials();
      clearAuthenticatedUsersCart();

      // Also destroy the collected and cached payment input
      cartStore.resetCheckoutPayments();
      const {
        placeOrder: { orders, token },
      } = data;

      // Send user to order confirmation page
      Router.push(
        `/checkout/order?orderId=${orders[0].referenceId}${
          token ? `&token=${token}` : ""
        }`
      );
      // this.placeOrderAtNWS();
    } catch (error) {
      console.log("Checkout Actions Error ===> ", error);
      if (this._isMounted) {
        this.setState({
          hasPaymentError: true,
          isPlacingOrder: false,
          actionAlerts: {
            3: {
              alertType: "error",
              title: "Payment method failed",
              message: error.toString().replace("Error: GraphQL error:", ""),
            },
          },
        });
      }
    }
  };

  renderPlacingOrderOverlay = () => {
    const { isPlacingOrder } = this.state;

    return (
      <Dialog
        fullScreen
        disableBackdropClick={true}
        disableEscapeKeyDown={true}
        open={isPlacingOrder}
      >
        <PageLoading delay={0} message="Placing your order..." />
      </Dialog>
    );
  };

  render() {
    const {
      addressValidation,
      addressValidationResults,
      cart,
      cartStore,
      paymentMethods,
    } = this.props;
    const {
      checkout: { fulfillmentGroups, summary },
      items,
    } = cart;
    const { actionAlerts, hasPaymentError } = this.state;
    const [fulfillmentGroup] = fulfillmentGroups;

    // Order summary
    const {
      fulfillmentTotal,
      itemTotal,
      surchargeTotal,
      taxTotal,
      total,
      discountTotal,
    } = summary;
    const checkoutSummary = {
      displayDiscount: discountTotal && discountTotal.displayAmount,
      displayShipping: fulfillmentTotal && fulfillmentTotal.displayAmount,
      displaySubtotal: itemTotal.displayAmount,
      displaySurcharge: surchargeTotal.displayAmount,
      displayTotal: total.displayAmount,
      displayTax: taxTotal && taxTotal.displayAmount,
      items,
    };

    // const addresses = fulfillmentGroups.reduce((list, group) => {
    //   if (group.shippingAddress) list.push(group.shippingAddress);
    //   return list;
    // }, []);

    const userProfileAddress = JSON.parse(localStorage.getItem("UserAddress"));
    let addresses = "";
    if (
      userProfileAddress != undefined &&
      userProfileAddress.fullName &&
      userProfileAddress.address1
    ) {
      // addresses = [userProfileAddress];
      // addresses = addresses.filter(function (obj) {
      //   delete obj["__typename"];
      //   delete obj["_id"];
      //   console.log(obj);
      //   return obj;
      // });
      addresses = [
        {
          address1: userProfileAddress.address1,
          address2: null,
          city: userProfileAddress.city,
          company: null,
          country: userProfileAddress.country,
          fullName: userProfileAddress.fullName,
          isBillingDefault: false,
          isCommercial: false,
          isShippingDefault: false,
          phone: userProfileAddress.phone,
          postal: userProfileAddress.postal,
          region: userProfileAddress.region,
        },
      ];
    } else {
      addresses = [
        {
          address1: "Test",
          address2: null,
          city: "Test",
          company: null,
          country: "GB",
          fullName: "Test",
          isBillingDefault: false,
          isCommercial: false,
          isShippingDefault: false,
          phone: "123",
          postal: "Test",
          region: "Test",
        },
      ];
    }

    const payments = cartStore.checkoutPayments.slice();
    const remainingAmountDue = calculateRemainderDue(payments, total.amount);

    let PaymentComponent = PaymentsCheckoutAction;
    if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
      PaymentComponent = NoPaymentMethodsMessage;
    }

    let actions = "";
    if (process.env.ENABLE_SHIPPING) {
      actions = [
        {
          id: "1",
          activeLabel: "Enter a shipping address",
          completeLabel: "Shipping address",
          incompleteLabel: "Shipping address",
          status:
            fulfillmentGroup.type !== "shipping" ||
            fulfillmentGroup.shippingAddress
              ? "complete"
              : "incomplete",
          component: ShippingAddressCheckoutAction,
          onSubmit: this.setShippingAddress,
          props: {
            addressValidationResults,
            alert: actionAlerts["1"],
            fulfillmentGroup,
            onAddressValidation: addressValidation,
          },
        },
        {
          id: "2",
          activeLabel: "Choose a shipping method",
          completeLabel: "Shipping method",
          incompleteLabel: "Shipping method",
          status: fulfillmentGroup.selectedFulfillmentOption
            ? "complete"
            : "incomplete",
          component: FulfillmentOptionsCheckoutAction,
          onSubmit: this.setShippingMethod,
          props: {
            alert: actionAlerts["2"],
            fulfillmentGroup,
          },
        },
        {
          id: "3",
          activeLabel: "Enter payment information",
          completeLabel: "Payment information",
          incompleteLabel: "Payment information",
          status:
            remainingAmountDue === 0 && !hasPaymentError
              ? "complete"
              : "incomplete",
          component: PaymentComponent,
          onSubmit: this.handlePaymentSubmit,
          props: {
            addresses,
            alert: actionAlerts["3"],
            onReset: this.handlePaymentsReset,
            payments,
            paymentMethods,
            remainingAmountDue,
          },
        },
        {
          id: "4",
          activeLabel: "Review and place order",
          completeLabel: "Review and place order",
          incompleteLabel: "Review and place order",
          status: "incomplete",
          component: FinalReviewCheckoutAction,
          onSubmit: this.buildOrder,
          props: {
            alert: actionAlerts["4"],
            checkoutSummary,
            productURLPath: "/api/detectLanguage/product/",
          },
        },
      ];
    } else {
      actions = [
        // {
        //   id: "1",
        //   activeLabel: "Enter a shipping address",
        //   completeLabel: "Shipping address",
        //   incompleteLabel: "Shipping address",
        //   status: fulfillmentGroup.type !== "shipping" || fulfillmentGroup.shippingAddress ? "complete" : "incomplete",
        //   component: ShippingAddressCheckoutAction,
        //   onSubmit: this.setShippingAddress,
        //   props: {
        //     addressValidationResults,
        //     alert: actionAlerts["1"],
        //     fulfillmentGroup,
        //     onAddressValidation: addressValidation
        //   }
        // },
        // {
        //   id: "2",
        //   activeLabel: "Choose a shipping method",
        //   completeLabel: "Shipping method",
        //   incompleteLabel: "Shipping method",
        //   status: fulfillmentGroup.selectedFulfillmentOption ? "complete" : "incomplete",
        //   component: FulfillmentOptionsCheckoutAction,
        //   onSubmit: this.setShippingMethod,
        //   props: {
        //     alert: actionAlerts["2"],
        //     fulfillmentGroup
        //   }
        // },
        {
          id: "3",
          activeLabel: "Enter payment information",
          completeLabel: "Payment information",
          incompleteLabel: "Payment information",
          status:
            remainingAmountDue === 0 && !hasPaymentError
              ? "complete"
              : "incomplete",
          component: PaymentComponent,
          onSubmit: this.handlePaymentSubmit,
          props: {
            addresses,
            alert: actionAlerts["3"],
            onReset: this.handlePaymentsReset,
            payments,
            paymentMethods,
            remainingAmountDue,
          },
        },
        {
          id: "4",
          activeLabel: "Review and place order",
          completeLabel: "Review and place order",
          incompleteLabel: "Review and place order",
          status: "incomplete",
          component: FinalReviewCheckoutAction,
          onSubmit: this.buildOrder,
          props: {
            alert: actionAlerts["4"],
            checkoutSummary,
            productURLPath: "/api/detectLanguage/product/",
          },
        },
      ];
    }

    return (
      <Fragment>
        {this.renderPlacingOrderOverlay()}
        <Actions actions={actions} />
      </Fragment>
    );
  }
}

export default withAddressValidation(CheckoutActions);
