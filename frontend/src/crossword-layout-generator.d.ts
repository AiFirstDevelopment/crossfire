declare module 'crossword-layout-generator' {
  interface LayoutInput {
    clue: string;
    answer: string;
  }

  interface LayoutResult {
    clue: string;
    answer: string;
    startx: number;
    starty: number;
    position: number;
    orientation: 'across' | 'down' | 'none';
  }

  interface LayoutOutput {
    rows: number;
    cols: number;
    table: string[][];
    result: LayoutResult[];
  }

  function generateLayout(input: LayoutInput[]): LayoutOutput;

  export = { generateLayout };
}
