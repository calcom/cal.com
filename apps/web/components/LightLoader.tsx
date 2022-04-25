export type LightLoaderProps = {
  style?: Object;
};

export default function LightLoader(props: LightLoaderProps) {
  const { style } = props;

  return (
    <div style={style} className="loader border-white">
      <span className="loader-inner bg-white"></span>
    </div>
  );
}
