export type LoaderProps = {
  style?: Object;
};

export default function Loader(props: LoaderProps) {
  const { style } = props;

  return (
    <div style={style} className="loader border-brand dark:border-darkmodebrand">
      <span className="loader-inner bg-brand dark:bg-darkmodebrand"></span>
    </div>
  );
}
