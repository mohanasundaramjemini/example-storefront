import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import inject from "hocs/inject";
import classNames from "classnames";
import { Button, TextField, Typography, Paper } from "@material-ui/core";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import ListItemText from "@material-ui/core/ListItemText";
import MenuList from "@material-ui/core/MenuList";
import MenuItem from "@material-ui/core/MenuItem";
import Popover from "@material-ui/core/Popover";
import ChevronDownIcon from "mdi-material-ui/ChevronDown";
import ChevronRight from "mdi-material-ui/ChevronRight";
import ChevronUpIcon from "mdi-material-ui/ChevronUp";
import { withStyles } from "@material-ui/core/styles";
import Router from "translations/i18nRouter";
import Link from "components/Link";

const styles = (theme) => ({
  popover: {
    left: "0!important",
    maxWidth: "100vw",
    padding: theme.spacing(2),
    width: "100vw",
  },
  grid: {
    width: "100vw",
  },
  navigationShopAllLink: {
    display: "flex",
    textDecoration: "underline",
    fontSize: "14px",
    marginTop: theme.spacing(6),
    marginBottom: theme.spacing(2),
    fontFamily: theme.typography.fontFamily,
  },
  navigationShopAllLinkIcon: {
    fontSize: "12px",
  },
  primaryNavItem: {
    textTransform: "capitalize",
  },
  // paper: {
  //   height: 140,
  //   width: 100,
  // },
});

class NavigationItemDesktop extends Component {
  static propTypes = {
    classes: PropTypes.object,
    navItem: PropTypes.object,
    routingStore: PropTypes.object,
  };

  static defaultProps = {
    classes: {},
    navItem: {},
    routingStore: {},
  };

  state = { isSubNavOpen: false };

  linkPath = (providedNavItem) => {
    const { navItem, routingStore } = this.props;

    const currentNavItem =
      (providedNavItem && providedNavItem.navigationItem) ||
      navItem.navigationItem;

    return routingStore.queryString !== ""
      ? `${currentNavItem.data.url}?${routingStore.queryString}`
      : `${currentNavItem.data.url}`;
  };

  get hasSubNavItems() {
    const {
      navItem: { items },
    } = this.props;
    return Array.isArray(items) && items.length > 0;
  }

  onClick = (event) => {
    event.preventDefault();

    if (this.hasSubNavItems) {
      this.setState({ isSubNavOpen: !this.state.isSubNavOpen });
    } else {
      const path = this.linkPath();
      Router.push(path);
    }
  };

  onClose = () => {
    this.setState({ isSubNavOpen: false });
  };

  handleSubmit = () => {
    const path = this.linkPath();
    // event.preventDefault();
  };

  renderSubNav(navItemGroup) {
    const menuItems = navItemGroup.items.map((item, index) => {
      const {
        navigationItem: {
          data: {
            contentForLanguage,
            classNames: navigationItemClassNames,
            isUrlRelative,
            shouldOpenInNewWindow,
          },
        },
      } = item;
      return (
        <MenuItem dense key={index}>
          <Link
            className={navigationItemClassNames}
            onClick={this.onClose}
            route={this.linkPath(item)}
            href={this.linkPath(item)}
            isUrlAbsolute={!isUrlRelative}
            shouldOpenInNewWindow={shouldOpenInNewWindow}
          >
            <ListItemText primary={contentForLanguage} />
          </Link>
        </MenuItem>
      );
    });

    menuItems.unshift(<Divider key="divider" />);

    return menuItems;
  }

  renderPopover() {
    const {
      classes,
      navItem,
      navItem: { items, navigationItem },
    } = this.props;

    if (items) {
      return (
        <Popover
          classes={{ paper: classes.popover }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: 0, top: 64 }}
          elevation={1}
          onClose={this.onClose}
          open={this.state.isSubNavOpen}
        >
          <Grid container className={classes.grid} spacing={2}>
            {items.map((item, index) => {
              const {
                navigationItem: {
                  data: {
                    contentForLanguage,
                    classNames: navigationItemClassNames,
                    isUrlRelative,
                    shouldOpenInNewWindow,
                  },
                },
              } = item;
              return (
                <Grid item key={index}>
                  <form
                    action={`${this.linkPath()}en/tag/search`}
                    className={classes.container}
                    onSubmit={this.handleSubmit()}
                  >
                    <Grid item xs={12}>
                      <Grid container justify="center" spacing={2}>
                        <Grid key={1} item>
                          <Typography variant="h5" gutterBottom>
                            Location A
                          </Typography>
                          <TextField
                            id="standard-multiline-flexible"
                            label="Street Number"
                            multiline
                            name="street_number"
                          />
                          <br />
                          <TextField
                            id="standard-multiline-flexible"
                            label="Street Name"
                            multiline
                            name="street_name"
                          />
                          <br />
                          <TextField
                            id="standard-multiline-flexible"
                            label="City"
                            multiline
                            name="locationa"
                            required
                          />
                          <br />
                          <TextField
                            id="standard-multiline-flexible"
                            label="Country"
                            multiline
                            name="country"
                          />
                          <br />
                        </Grid>
                        <Grid key={2} item>
                          <Typography variant="h5" gutterBottom>
                            Location Z
                          </Typography>
                          <TextField
                            id="standard-multiline-flexible"
                            label="Street Number"
                            multiline
                            name="loc2_snum"
                          />
                          <br />
                          <TextField
                            id="standard-multiline-flexible"
                            label="Street Name"
                            multiline
                            name="loc2_sname"
                          />
                          <br />
                          <TextField
                            id="standard-multiline-flexible"
                            label="City"
                            multiline
                            name="locationz"
                            required
                          />
                          <br />
                          <TextField
                            id="standard-multiline-flexible"
                            label="Country"
                            multiline
                            name="loc2_cntry"
                          />
                          <br />
                        </Grid>
                        <Grid key={3} item>
                          <Typography variant="h5" gutterBottom>
                            Service Attributes
                          </Typography>
                          <TextField
                            id="standard-multiline-flexible"
                            label="Service Type"
                            multiline
                            name="type"
                          />
                          <br />
                          <TextField
                            id="standard-multiline-flexible"
                            label="Speed (Mb)"
                            multiline
                            name="speed"
                          />
                          <br />
                        </Grid>
                      </Grid>
                      <br />
                      <br />
                      <Button type="submit" variant="contained" color="primary">
                        Check Serviceability
                      </Button>
                    </Grid>
                  </form>
                  {/* <MenuList disablePadding>
                    <MenuItem>
                      <Link
                        className={navigationItemClassNames}
                        href={this.linkPath(item)}
                        isUrlAbsolute={!isUrlRelative}
                        onClick={this.onClose}
                        shouldOpenInNewWindow={shouldOpenInNewWindow}
                      >
                        <ListItemText primary={contentForLanguage} />
                      </Link>
                    </MenuItem>
                    {Array.isArray(item.items) && this.renderSubNav(item)}
                  </MenuList> */}
                </Grid>
              );
            })}
          </Grid>
          {/* <Link
            className={classes.navigationShopAllLink}
            onClick={this.onClose}
            route={this.linkPath(navItem)}
            href={this.linkPath(navItem)}
            isUrlAbsolute={!navigationItem.data.isUrlRelative}
            shouldOpenInNewWindow={navigationItem.data.shouldOpenInNewWindow}
          >
            <span>
              Shop all {navigationItem.data.contentForLanguage}{" "}
              <ChevronRight className={classes.navigationShopAllLinkIcon} />
            </span>
          </Link> */}
        </Popover>
      );
    }

    return null;
  }

  render() {
    const {
      classes: { primaryNavItem },
      navItem,
      navItem: { navigationItem },
    } = this.props;

    return (
      <Fragment>
        <Button
          className={classNames(primaryNavItem, navigationItem.data.classNames)}
          color="inherit"
          onClick={this.onClick}
          href={this.linkPath(navItem)}
        >
          {navigationItem.data.contentForLanguage}
          {this.hasSubNavItems && (
            <Fragment>
              {this.state.isSubNavOpen ? (
                <ChevronUpIcon />
              ) : (
                <ChevronDownIcon />
              )}
            </Fragment>
          )}
        </Button>
        {this.hasSubNavItems && this.renderPopover()}
      </Fragment>
    );
  }
}

export default withStyles(styles)(
  inject("routingStore")(NavigationItemDesktop)
);
