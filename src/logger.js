// Step-based terminal logger with clean output

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

class Logger {
  constructor() {
    this.totalSteps = 7;
    this.currentStep = 0;
  }

  step(message) {
    this.currentStep++;
    const prefix = `${COLORS.cyan}[${this.currentStep}/${this.totalSteps}]${COLORS.reset}`;
    console.log(`${prefix} ${message}`);
  }

  info(message) {
    console.log(`    ${COLORS.dim}${message}${COLORS.reset}`);
  }

  success(message) {
    console.log(`${COLORS.green}${COLORS.bright}${message}${COLORS.reset}`);
  }

  warn(message) {
    console.log(`${COLORS.yellow}⚠ ${message}${COLORS.reset}`);
  }

  error(message) {
    console.error(`${COLORS.red}✖ ${message}${COLORS.reset}`);
  }

  summary({ htmlPath, cssCount, finalUrl, openCmd }) {
    console.log('');
    console.log(`${COLORS.green}${COLORS.bright}Done.${COLORS.reset}`);
    console.log('');
    console.log(`${COLORS.bright}HTML:${COLORS.reset}`);
    console.log(`  ${htmlPath}`);
    console.log('');
    console.log(`${COLORS.bright}CSS:${COLORS.reset}`);
    console.log(`  ${cssCount} file${cssCount !== 1 ? 's' : ''}`);
    console.log('');
    console.log(`${COLORS.bright}Final URL:${COLORS.reset}`);
    console.log(`  ${finalUrl}`);
    console.log('');
    console.log(`${COLORS.bright}Open:${COLORS.reset}`);
    console.log(`  ${openCmd}`);
    console.log('');
  }
}

export function createLogger() {
  return new Logger();
}
