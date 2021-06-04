import React, { Component } from "react";
import PropTypes from "prop-types";
import Helmet from "react-helmet";
import inject from "hocs/inject";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import CartEmptyMessage from "@reactioncommerce/components/CartEmptyMessage/v1";
import CartSummary from "@reactioncommerce/components/CartSummary/v1";
import withCart from "containers/cart/withCart";
import CartItems from "components/CartItems";
import CheckoutButtons from "components/CheckoutButtons";
import Link from "components/Link";
import Layout from "components/Layout";
import Router from "translations/i18nRouter";
import PageLoading from "components/PageLoading";
import { withApollo } from "lib/apollo/withApollo";

import fetchPrimaryShop from "staticUtils/shop/fetchPrimaryShop";
import fetchTranslations from "staticUtils/translations/fetchTranslations";

const styles = (theme) => ({
  cartEmptyMessageContainer: {
    margin: "80px 0"
  },
  checkoutButtonsContainer: {
    backgroundColor: theme.palette.reaction.black02,
    padding: theme.spacing(2)
  },
  customerSupportCopy: {
    paddingLeft: `${theme.spacing(4)}px !important`
  },
  phoneNumber: {
    fontWeight: theme.typography.fontWeightBold
  },
  title: {
    fontWeight: theme.typography.fontWeightRegular,
    marginTop: "1.6rem",
    marginBottom: "3.1rem"
  },
  itemWrapper: {
    borderTop: theme.palette.borders.default,
    borderBottom: theme.palette.borders.default
  }
});

class CartPage extends Component {
  static propTypes = {
    cart: PropTypes.shape({
      totalItems: PropTypes.number,
      items: PropTypes.arrayOf(PropTypes.object),
      checkout: PropTypes.shape({
        fulfillmentTotal: PropTypes.shape({
          displayAmount: PropTypes.string
        }),
        itemTotal: PropTypes.shape({
          displayAmount: PropTypes.string
        }),
        taxTotal: PropTypes.shape({
          displayAmount: PropTypes.string
        })
      })
    }),
    classes: PropTypes.object,
    hasMoreCartItems: PropTypes.bool,
    loadMoreCartItems: PropTypes.func,
    onChangeCartItemsQuantity: PropTypes.func,
    onRemoveCartItems: PropTypes.func,
    shop: PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  };

  handleClick = () => Router.push("/");

  handleItemQuantityChange = (quantity, cartItemId) => {
    const { onChangeCartItemsQuantity } = this.props;

    onChangeCartItemsQuantity({ quantity, cartItemId });
  };

  handleRemoveItem = async (itemId) => {
    const { onRemoveCartItems } = this.props;

    await onRemoveCartItems(itemId);
  };

  renderCartItems() {
    const { cart, classes, hasMoreCartItems, loadMoreCartItems, authStore } = this.props;
    if(authStore.account.addressBook) {
      console.log('Cart this.props =====> ', authStore.account.addressBook.edges[0].node);
      localStorage.removeItem('UserAddress');
      localStorage.setItem('UserAddress', JSON.stringify(authStore.account.addressBook.edges[0].node));  
    }
    if (cart && Array.isArray(cart.items) && cart.items.length) {
      return (
        <Grid item xs={12} md={8}>
          <div className={classes.itemWrapper}>
            <CartItems
              hasMoreCartItems={hasMoreCartItems}
              onLoadMoreCartItems={loadMoreCartItems}
              items={cart.items}
              onChangeCartItemQuantity={this.handleItemQuantityChange}
              onRemoveItemFromCart={this.handleRemoveItem}
            />
          </div>
        </Grid>
      );
    }

    return (
      <Grid item xs={12} className={classes.cartEmptyMessageContainer}>
        <CartEmptyMessage onClick={this.handleClick} />
      </Grid>
    );
  }

  requestQuote = async function (itemInfo) {
    try {
      console.log('Cart Product Code =====> ', itemInfo.variantTitle);
      console.log('Cart Summary =====> ', itemInfo.productTags.nodes);
      let authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjYXRhd29yeCJ9.qb7x10X3T_bBq64Il0UoLMr2gPpqiZsmk48e-6QXuM8';
      const requestOptions = {
        method: 'POST',
        headers: { 'Authorization': authorization, 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      };

      // const res = await fetch(`http://34.106.29.102:8081/api/mef/quoteManagement/quote/requestQuotes?allRequestParams=location1%3DASIA%201%26location2%3DEUROPE`, requestOptions);
      const res = await fetch(`http://34.106.29.102:8000/quoteManagement/requestQuotes?productcode=${itemInfo.variantTitle}&buyerCompany=Acme`, requestOptions);
      const quote = await res.json();

      localStorage.removeItem('currentQuote');
      localStorage.setItem('currentQuote', JSON.stringify(quote));
      console.log('Request Quote Success', quote);
      if (quote.data !== undefined) {
        console.log('Request Quote Success', quote.data);
      } else {
        console.log('Request Quote Failed');
      }
    } catch (err) {
      console.log("Unable request quote");
      console.log(err.message);
    }
  }

  renderCartSummary() {
    const { cart, classes } = this.props;
    let itemInfo = '';
    let itemPrice = 50;
    if (cart && cart.checkout && cart.checkout.summary && Array.isArray(cart.items) && cart.items.length) {
      const { fulfillmentTotal, itemTotal, surchargeTotal, taxTotal, total } = cart.checkout.summary;
      // cart.items.price.amount = 100;
      // itemTotal.displayAmount = 50;
      // Object.assign(itemTotal, {displayAmount:50});
      cart.items.forEach(function (item, index) {

        console.log('Cart details =====> ', cart);
        console.log('Cart details item =====> ', item);
        console.log('Cart item item =====> ', item.price.amount);
        console.log('Call NWS Request Quote Endpoint');
        itemInfo = item;
      });
      this.requestQuote(itemInfo);

      return (
        <Grid item xs={12} md={3}>
          <CartSummary
            displayShipping={fulfillmentTotal && fulfillmentTotal.displayAmount}
            displaySubtotal={itemTotal && itemTotal.displayAmount}
            // displaySubtotal={itemPrice}
            displaySurcharge={surchargeTotal && surchargeTotal.displayAmount}
            displayTax={taxTotal && taxTotal.displayAmount}
            displayTotal={total && total.displayAmount}
            // displayTotal={itemPrice}
            itemsQuantity={cart.totalItemQuantity}
          />
          <div className={classes.checkoutButtonsContainer}>
            <CheckoutButtons />
          </div>
        </Grid>
      );
    }

    return null;
  }

  render() {
    const { cart, classes, shop } = this.props;
    // when a user has no item in cart in a new session, this.props.cart is null
    // when the app is still loading, this.props.cart is undefined
    if (typeof cart === "undefined") return <PageLoading delay={0} />;

    return (
      <Layout shop={shop}>
        <Helmet
          title={`Cart | ${shop && shop.name}`}
          meta={[{ name: "description", content: shop && shop.description }]}
        />
        <section>
          <Typography className={classes.title} variant="h6" align="center">
            Shopping Cart
          </Typography>
          <Grid container spacing={3}>
            {this.renderCartItems()}
            {this.renderCartSummary()}
            {/* <Grid className={classes.customerSupportCopy} item>
              <Typography paragraph variant="caption">
                Have questions? call <span className={classes.phoneNumber}>1.800.555.5555</span>
              </Typography>
              <Typography paragraph variant="caption">
                <Link href="#">Shipping information</Link>
              </Typography>
              <Typography paragraph variant="caption">
                <Link href="#">Return policy</Link>
              </Typography>
            </Grid> */}
          </Grid>
        </section>
      </Layout>
    );
  }
}

/**
 *  Server props for the cart route
 *
 * @param {String} lang - the shop's language
 * @returns {Object} props
 */
export async function getServerSideProps({ params: { lang } }) {
  return {
    props: {
      ...await fetchPrimaryShop(lang),
      ...await fetchTranslations(lang, ["common"])
    }
  };
}

export default withApollo()(withStyles(styles)(withCart(inject("uiStore")(CartPage))));
