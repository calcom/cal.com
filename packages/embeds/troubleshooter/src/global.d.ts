declare const __CAL_ORIGIN__: string;

interface Window {
  __calEmbedTroubleshooter?: import("./troubleshooter").CalEmbedTroubleshooter;
  __calEmbedTroubleshooterDisabled?: boolean;
}
