export interface LesPagePluginOptions {
  dir: string;
  outSubDir?: string;
  ignore: string[];
  layout?: string;
}

export interface ProcessFileRequestMessage {
  id: number;
  infile: string;
  outdir: string;
  indir: string;
  clashRemap?: Record<string, string>;
}

export interface CopyFileResponseMessage {
  id: number;
  type: "copy";
}
export interface ProcessFileResponseMessage {
  id: number;
  type: "process";
  outfile: string;
  content: string;
  [key: string]: any;
}
export type ResponseMessage =
  | CopyFileResponseMessage
  | ProcessFileResponseMessage;
