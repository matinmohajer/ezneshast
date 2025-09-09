import { Skeleton } from "../app/components/ui/Skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
};

export default meta;

export const TextLine = {
  args: { height: 16, width: "60%" },
};

export const Rect = {
  args: { height: 120, width: "100%", variant: "rect" },
};

export const Circle = {
  args: { height: 64, width: 64, variant: "circle" },
};
