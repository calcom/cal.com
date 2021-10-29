import { ComponentMeta } from "@storybook/react";
import React from "react";

export default {
  title: "Components/Typography",
  argTypes: {},
} as ComponentMeta<any>;

export const Typography = () => {
  return (
    <div>
      <div className="typo-row">
        <h1>Header 1</h1>
        <h1 className="medium">Header 1</h1>
        <h1 className="regular">Header 1</h1>
      </div>

      <div className="typo-row">
        <h2>Header 2</h2>
        <h2 className="medium">Header 2</h2>
        <h2 className="regular">Header 2</h2>
      </div>

      <div className="typo-row">
        <h3>Header 3</h3>
        <h3 className="medium">Header 3</h3>
        <h3 className="regular">Header 3</h3>
      </div>

      <div className="typo-row">
        <h4>Header 4</h4>
        <h4 className="medium">Header 4</h4>
        <h4 className="regular">Header 4</h4>
      </div>

      <div className="typo-row">
        <h5>Header 5</h5>
        <h5 className="medium">Header 5</h5>
        <h5 className="regular">Header 5</h5>
      </div>

      <div className="typo-row">
        <h6>Header 6</h6>
        <h6 className="medium">Header 6</h6>
        <h6 className="regular">Header 6</h6>
      </div>

      <div className="typo-row">
        <ul>
          <li>You</li>
          <li>Other people</li>
          <li>Cause</li>
        </ul>
      </div>

      <div className="typo-row">
        <ol>
          <li>You</li>
          <li>Other people</li>
          <li>Cause</li>
        </ol>
      </div>
    </div>
  );
};
