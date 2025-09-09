import Card from "../app/components/ui/Card";

const meta = {
  title: "UI/Card",
  component: Card,
};

export default meta;

export const Basic = {
  args: {
    header: <div className="font-medium">Header</div>,
    children: <div>Card content</div>,
    footer: <div>Footer</div>,
  },
};
