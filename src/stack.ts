export interface StackDescriptionBlock {
  type: 'description';
  name: string;
  message: string;
}

export interface StackLocationBlock {
  type: 'location';
  entry: string;
  location: string;
  line: number;
  column: number;
}

export type StackBlock = StackDescriptionBlock | StackLocationBlock;

// v8 frame with a function name, e.g. `at [async ][new ]name[ [as alias]] (location)`
const namedFrameRegex = /^\s*at (.+?) \((.+)\)$/;
// v8 frame without a function name, e.g. `at [async ]location`
const anonymousFrameRegex = /^\s*at (?:(async) )?(.+)$/;
// spidermonkey and javascriptcore frame, e.g. `name@path:line:column`
const webFrameRegex = /^\s*((?:[^\s@:][^@:]*)?)@(.+:\d+:\d+)$/;
// v8 location of eval-ed code, e.g. `eval at name (origin), <anonymous>:line:column`
const evalLocationRegex = /^eval at [^(]*\((.+)\), [^,]*$/;
const positionRegex = /^(.+):(\d+):(\d+)$/;
const descriptionRegex = /^(\w+)(?::(.*))?$/;

/**
 * parse a stack into its components
 * @param stack stack content
 * @returns a list of error and stack information
 */
export function disassembleStack(stack: string): StackBlock[] {
  return stack
    .split('\n')
    .map(parseLine)
    .filter((block): block is StackBlock => block !== null);
}

/**
 * parse a line of a stack
 * @param line a line of the stack
 * @returns the error or location described by the line, or null for a line without a source position
 */
function parseLine(line: string): StackBlock | null {
  const frameMatch =
    namedFrameRegex.exec(line) ??
    anonymousFrameRegex.exec(line) ??
    webFrameRegex.exec(line);
  if (frameMatch) {
    const [, entry = '', location] = frameMatch;

    return parseLocation(entry, location!);
  }

  const descriptionMatch = descriptionRegex.exec(line);
  if (descriptionMatch) {
    const [, name, rawMessage = ''] = descriptionMatch;

    return {
      type: 'description',
      name: name!,
      message: rawMessage.trimStart(),
    };
  }

  return null;
}

/**
 * parse the location of a stack frame
 * @param entry the function name of the frame
 * @param location the location part of the frame
 * @returns the location block, or null if the location has no source position (e.g. `native` or `index 0`)
 */
function parseLocation(
  entry: string,
  location: string,
): StackLocationBlock | null {
  // point eval-ed code at the source calling eval, as the eval-ed code has no file of its own
  const evalMatch = evalLocationRegex.exec(location);
  if (evalMatch) {
    return parseLocation(entry, evalMatch[1]!);
  }

  const positionMatch = positionRegex.exec(location);
  if (positionMatch) {
    const [, path, line, column] = positionMatch;

    return {
      type: 'location',
      entry,
      location: path!,
      line: parseInt(line!),
      column: parseInt(column!),
    };
  }

  return null;
}

/**
 * reassemble stack components
 * @param stacks stack information
 * @returns the reassembled stack
 */
export function assembleStack(stacks: StackBlock[]): string {
  return stacks
    .map((stack) => {
      if (stack.type === 'location') {
        return stack.entry
          ? `    at ${stack.entry} (${stack.location}:${stack.line}:${stack.column})`
          : `    at ${stack.location}:${stack.line}:${stack.column}`;
      } else {
        return `${stack.name}: ${stack.message}`;
      }
    })
    .join('\n');
}
