import "../app/globals.css";
import type { Preview } from "@storybook/nextjs-vite";
import React from "react";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    a11y: { disable: false },
  },
  decorators: [
    (Story) =>
      React.createElement("div", { dir: "rtl" }, React.createElement(Story)),
  ],
};

export default preview;
