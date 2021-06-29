/* eslint-disable react/no-multi-comp */
import React, { Fragment, Component } from "react";
import PropTypes from "prop-types";
import { isEqual } from "lodash";
import styled from "styled-components";
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

const MessageDiv = styled.div`
  ${addTypographyStyles("NoPaymentMethodsMessage", "bodyText")}
`;

const NoPaymentMethodsMessage = () => (
  <MessageDiv>No payment methods available</MessageDiv>
);

NoPaymentMethodsMessage.renderComplete = () => "";

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

  setShippingAddress = async (address) => {
    console.log("setShippingAddress Parameter ====> ", address);
    const {
      checkoutMutations: { onSetShippingAddress },
    } = this.props;
    delete address.isValid;
    const { data, error } = await onSetShippingAddress(address);
    console.log("setShippingAddress data ====> ", data);
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
    console.log("shippingMethod Parameter ====> ", shippingMethod);

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
    console.log("setShippingMethod ====> ", fulfillmentOption);
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
    console.log(
      "Env Variable ====> ",
      process.env.ENABLE_SHIPPING,
      process.env.DEFAULT_SHIPPING_ID
    );
    console.log("buildOrder fulfillmentGroups =====> ", this.props);

    const cartId = cartStore.hasAccountCart
      ? cartStore.accountCartId
      : cartStore.anonymousCartId;
    const { checkout } = cart;

    console.log("buildOrder checkout ====> ", checkout);
    const fulfillmentGroups = checkout.fulfillmentGroups.map((group) => {
      const { data } = group;
      const { selectedFulfillmentOption } = group;

      console.log("buildOrder data ====> ", group);
      console.log(
        "buildOrder selectedFulfillmentOption ====> ",
        selectedFulfillmentOption
      );

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

    console.log("buildOrder order ====> ", order);
    return this.setState({ isPlacingOrder: true }, () =>
      this.placeOrder(order)
    );
  };

  placeOrderAtNWS = async function () {
    try {
      console.log(
        "Current Quote =====> ",
        JSON.parse(localStorage.getItem("currentQuote"))
      );
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
    console.log("checkout Actions placeOrder ===> ", order);
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
      console.log("checkoutActions order ===> ", order);
      order.fulfillmentGroups[0].totalPrice = order.fulfillmentGroups[0].items.price;
      console.log("checkoutActions payments ===> ", payments);
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
      console.log("checkoutActions data 1 ===> ", data);
      cartStore.clearAnonymousCartCredentials();
      clearAuthenticatedUsersCart();

      console.log("checkoutActions data 2 ===> ", data);
      // Also destroy the collected and cached payment input
      cartStore.resetCheckoutPayments();
      console.log("checkoutActions data 3 ===> ", data);
      const {
        placeOrder: { orders, token },
      } = data;

      // Send user to order confirmation page
      Router.push(
        `/checkout/order?orderId=${orders[0].referenceId}${
          token ? `&token=${token}` : ""
        }`
      );
      console.log("Call NWS Order Endpoint");
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

    console.log('Checkout Actions Props =====> ', this.props);
    const {
      checkout: { fulfillmentGroups, summary },
      items,
    } = cart;
    const { actionAlerts, hasPaymentError } = this.state;
    const [fulfillmentGroup] = fulfillmentGroups;

    // Order summary
    const { fulfillmentTotal, itemTotal, surchargeTotal, taxTotal, total, discountTotal } =
      summary;
    const checkoutSummary = {
      displayDiscount:discountTotal && discountTotal.displayAmount,
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

    console.log(
      "UserAddress From Local storage ===> ",
      JSON.parse(localStorage.getItem("UserAddress"))
    );
    const userProfileAddress = JSON.parse(localStorage.getItem("UserAddress"));
    let addresses = "";
    if (userProfileAddress != undefined && userProfileAddress.fullName && userProfileAddress.address1) {
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
    console.log(
      "process.env.ENABLE_SHIPPING ===> ",
      process.env.ENABLE_SHIPPING
    );
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
