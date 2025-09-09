import AudioPlayer from "../app/components/media/AudioPlayer";

const meta = {
  title: "Media/AudioPlayer",
  component: AudioPlayer,
  args: {
    src: "",
  },
};

export default meta;

export const Empty = {
  args: { src: null },
};

export const WithSrc = {
  args: { src: "/sample.mp3" },
};
