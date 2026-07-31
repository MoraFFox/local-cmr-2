// Ambient declarations for bidi-js (ships no bundled types).
// The ESM build exports a factory function as its default export; the named
// exports only exist on the object the factory returns.
declare module "bidi-js" {
  export interface BidiParagraph {
    start: number;
    end: number;
    level: number;
  }

  export interface EmbeddingLevelsResult {
    levels: Uint8Array;
    paragraphs: BidiParagraph[];
  }

  export type BaseDirection = "ltr" | "rtl" | "auto";

  export interface BidiJsApi {
    getEmbeddingLevels(
      string: string,
      baseDirection?: BaseDirection,
    ): EmbeddingLevelsResult;
    getReorderSegments(
      string: string,
      embeddingLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): [number, number][];
    getReorderedIndices(
      string: string,
      embeddingLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): number[];
    getReorderedString(
      string: string,
      embeddingLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): string;
    getMirroredCharacter(char: string): string | null | undefined;
  }

  const bidiFactory: () => BidiJsApi;
  export default bidiFactory;
}
