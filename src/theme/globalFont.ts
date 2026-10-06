import React from 'react';
import { Text, TextInput } from 'react-native';

const QUICKCART_FONT = 'PlusJakartaSans-Regular';

const originalCreateElement = React.createElement;

React.createElement = ((type: any, props: any, ...children: any[]) => {
  if (type === Text || type === TextInput) {
    const existingStyle = props?.style;

    const style = [{ fontFamily: QUICKCART_FONT }, existingStyle];

    return originalCreateElement.call(
      React,
      type,
      {
        ...props,
        style,
      },
      ...children,
    );
  }

  return originalCreateElement.call(React, type, props, ...children);
}) as typeof React.createElement;

export default QUICKCART_FONT;
