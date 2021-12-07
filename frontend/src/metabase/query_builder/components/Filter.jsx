/* eslint-disable react/prop-types */
import React from "react";

import Value from "metabase/components/Value";

import Dimension from "metabase-lib/lib/Dimension";

import { generateTimeFilterValuesDescriptions } from "metabase/lib/query_time";
import { hasFilterOptions } from "metabase/lib/query/filter";
import { getFilterArgumentFormatOptions } from "metabase/lib/schema_metadata";

import { t, ngettext, msgid } from "ttag";

const DEFAULT_FILTER_RENDERER = ({ field, operator, values }) => {
  const items = [field, operator, ...values];
  // insert an "and" at the end if multiple values
  // NOTE: works for "between", not sure about others
  if (values.length > 1) {
    items.splice(items.length - 1, 0, "and");
  }
  return (
    <span>
      {items
        .filter(f => f)
        .map((item, index, array) => (
          <span key={index}>
            {item}
            {index < array.length - 1 ? " " : null}
          </span>
        ))}
    </span>
  );
};

export const OperatorFilter = ({
  filter,
  metadata,
  maxDisplayValues,
  children = DEFAULT_FILTER_RENDERER,
}) => {
  const [op, field] = filter;
  const values = hasFilterOptions(filter)
    ? filter.slice(2, -1)
    : filter.slice(2);

  const dimension = Dimension.parseMBQL(field, metadata);
  if (!dimension) {
    return null;
  }

  const operator = dimension.filterOperator(op);

  let formattedValues;
  if (operator && operator.multi && values.length > maxDisplayValues) {
    const n = values.length;
    formattedValues = [ngettext(msgid`${n} selection`, `${n} selections`, n)];
  } else if (dimension.field().isDate() && !dimension.field().isTime()) {
    formattedValues = generateTimeFilterValuesDescriptions(filter);
  } else {
    const valuesWithOptions = values.map((value, index) => [
      value,
      getFilterArgumentFormatOptions(operator, index),
    ]);
    formattedValues = valuesWithOptions
      .filter(([value, options]) => value !== undefined && !options.hide)
      .map(([value, options], index) => (
        <Value
          key={index}
          value={value}
          column={dimension.field()}
          remap
          {...options}
        />
      ));
  }
  return children({
    field: dimension.displayName(),
    operator: operator && operator.moreVerboseName,
    values: formattedValues,
  });
};

export const SegmentFilter = ({
  filter,
  metadata,
  maxDisplayValues,
  children = DEFAULT_FILTER_RENDERER,
}) => {
  const segment = metadata.segment(filter[1]);
  return children({
    operator: t`Matches`,
    values: segment ? [segment.name] : [],
  });
};

const Filter = ({ filter, ...props }) =>
  filter[0] === "segment" ? (
    <SegmentFilter filter={filter} {...props} />
  ) : (
    <OperatorFilter filter={filter} {...props} />
  );

export default Filter;
