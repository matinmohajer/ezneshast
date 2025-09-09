import { Button } from "../app/components/ui/Button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: {
    children: "Button",
  },
};

export default meta;

export const Primary = {
  args: { variant: "primary" },
};

export const Secondary = {
  args: { variant: "secondary" },
};

export const Ghost = {
  args: { variant: "ghost" },
};

export const Danger = {
  args: { variant: "danger" },
};
