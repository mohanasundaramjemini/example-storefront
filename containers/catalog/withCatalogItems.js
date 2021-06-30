import React from "react";
import PropTypes from "prop-types";
import inject from "hocs/inject";
import { Query } from "@apollo/react-components";
import hoistNonReactStatic from "hoist-non-react-statics";
import {
  pagination,
  paginationVariablesFromUrlParams,
} from "lib/utils/pagination";
import catalogItemsQuery from "./catalogItems.gql";

/**
 * withCatalogItems higher order query component for fetching primaryShopId and catalog data
 * @name withCatalogItems
 * @param {React.Component} Component to decorate and apply
 * @returns {React.Component} - component decorated with primaryShopId and catalog as props
 */
export default function withCatalogItems(Component) {
  class CatalogItems extends React.Component {
    static propTypes = {
      primaryShopId: PropTypes.string,
      routingStore: PropTypes.object.isRequired,
      tag: PropTypes.shape({
        _id: PropTypes.string.isRequired,
      }),
      uiStore: PropTypes.object.isRequired,
    };

    render() {
      const { primaryShopId, routingStore, uiStore, tag, tags } = this.props;
      const [sortBy, sortOrder] = uiStore.sortBy.split("-");
      let tagIds =
        Object.keys(routingStore.query).length > 0 ? [] : tag && [tag._id];

      if (Object.keys(routingStore.query).length > 0) {
        let iteration = 1;
        let queryStrings = routingStore.query;
        delete queryStrings["slug"];
        delete queryStrings["lang"];

        for (let key in queryStrings) {
          if (iteration == 1) {
            if (queryStrings.speed !== "") {
              let tagResults = tags.filter(function (tag) {
                return (
                  tag.name ==
                  `${queryStrings.locationa
                    .toLowerCase()
                    .trim()}-${queryStrings.locationz.toLowerCase().trim()}-${
                    queryStrings.speed
                  }`
                );
              });
              if (tagResults.length > 0) {
                tagIds.push(tagResults[0]._id);
              }
            } else {
              let tagResults = tags.filter(function (tag) {
                return (
                  tag.name ==
                  `${queryStrings.locationa
                    .toLowerCase()
                    .trim()}-${queryStrings.locationz.toLowerCase().trim()}`
                );
              });
              if (tagResults.length > 0) {
                tagIds.push(tagResults[0]._id);
              }
            }
          }
          iteration++;
        }
      }
      if (!primaryShopId) {
        return <Component {...this.props} />;
      }

      const variables = {
        shopId: primaryShopId,
        ...paginationVariablesFromUrlParams(routingStore.query, {
          defaultPageLimit: uiStore.pageSize,
        }),
        tagIds,
        sortBy,
        sortByPriceCurrencyCode: uiStore.sortByCurrencyCode,
        sortOrder,
      };

      return (
        <Query
          errorPolicy="all"
          query={catalogItemsQuery}
          variables={variables}
        >
          {({ data, fetchMore, loading }) => {
            const { catalogItems } = data || {};

            return (
              <Component
                {...this.props}
                catalogItemsPageInfo={pagination({
                  fetchMore,
                  routingStore,
                  data,
                  queryName: "catalogItems",
                  limit: uiStore.pageSize,
                })}
                catalogItems={(catalogItems && catalogItems.edges) || []}
                isLoadingCatalogItems={loading}
              />
            );
          }}
        </Query>
      );
    }
  }

  hoistNonReactStatic(CatalogItems, Component);

  return inject("primaryShopId", "routingStore", "uiStore")(CatalogItems);
}
