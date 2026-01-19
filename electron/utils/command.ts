import { spawn } from 'node:child_process'

const MAX_BUILD_OUTPUT = 50_000

export interface CommandResult {
  exitCode: number | null
  output: string
  durationMs: number
  truncated: boolean
}

/**
 * Run a command with arguments in a specified working directory.
 * Captures stdout and stderr, truncating if output exceeds the maximum.
 */
export async function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<CommandResult> {
  return await new Promise<CommandResult>((resolve, reject) => {
    const startedAt = Date.now()
    let output = ''
    let truncated = false

    const appendOutput = (chunk: string) => {
      output += chunk
      if (output.length > MAX_BUILD_OUTPUT) {
        output = output.slice(output.length - MAX_BUILD_OUTPUT)
        truncated = true
      }
    }

    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
    })

    child.stdout?.on('data', (data) => appendOutput(data.toString()))
    child.stderr?.on('data', (data) => appendOutput(data.toString()))
    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? null,
        output,
        durationMs: Date.now() - startedAt,
        truncated,
      })
    })
  })
}
