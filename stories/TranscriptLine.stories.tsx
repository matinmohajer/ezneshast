import TranscriptLine from "../app/components/transcript/TranscriptLine";

const meta = {
  title: "Transcript/TranscriptLine",
  component: TranscriptLine,
  args: {
    text: "This is a sample transcript line that demonstrates styling.",
    timestampSeconds: 87,
  },
};

export default meta;

export const Default = {};

export const Active = {
  args: { active: true },
};
