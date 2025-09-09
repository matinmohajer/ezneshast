import Tag from "../app/components/ui/Tag";

const meta = {
  title: "UI/Tag",
  component: Tag,
  args: { children: "Tag" },
};

export default meta;

export const Default = {};
export const Success = { args: { variant: "success" } };
export const Warning = { args: { variant: "warning" } };
export const Danger = { args: { variant: "danger" } };
export const Muted = { args: { variant: "muted" } };
