import * as core from '@actions/core';
import {context} from '@actions/github';
import {IssuesProcessor} from './classes/issues-processor';
import {isValidDate} from './functions/dates/is-valid-date';
import {IIssuesProcessorOptions} from './interfaces/issues-processor-options';
import {Issue} from './classes/issue';

import {getStateInstance} from './services/state.service';

async function _run(): Promise<void> {
  try {
    const args = _getAndValidateArgs();

    const state = getStateInstance(args);
    await state.restore();

    const issueProcessor: IssuesProcessor = new IssuesProcessor(args, state);

    const rateLimitAtStart = await issueProcessor.getRateLimit();
    if (rateLimitAtStart) {
      core.debug(
        `Github API rate status: limit=${rateLimitAtStart.limit}, used=${rateLimitAtStart.used}, remaining=${rateLimitAtStart.remaining}`
      );
    }

    await issueProcessor.processIssues();

    const rateLimitAtEnd = await issueProcessor.getRateLimit();

    if (rateLimitAtEnd) {
      core.debug(
        `Github API rate status: limit=${rateLimitAtEnd.limit}, used=${rateLimitAtEnd.used}, remaining=${rateLimitAtEnd.remaining}`
      );

      if (rateLimitAtStart)
        core.info(
          `Github API rate used: ${
            rateLimitAtStart.remaining - rateLimitAtEnd.remaining
          }`
        );

      core.info(
        `Github API rate remaining: ${rateLimitAtEnd.remaining}; reset at: ${rateLimitAtEnd.reset}`
      );
    }

    await state.persist();

    await processOutput(
      issueProcessor.staleIssues,
      issueProcessor.closedIssues
    );
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

function _getDefaultArgs(): IIssuesProcessorOptions {
  const args: IIssuesProcessorOptions = {
    repoToken: '',
    staleIssueMessage: '',
    stalePrMessage: '',
    closeIssueMessage: '',
    closePrMessage: '',
    daysBeforeStale: 60.0,
    daysBeforeIssueStale: NaN,
    daysBeforePrStale: NaN,
    daysBeforeClose: 7,
    daysBeforeIssueClose: NaN,
    daysBeforePrClose: NaN,
    staleIssueLabel: 'Stale',
    closeIssueLabel: '',
    exemptIssueLabels: '',
    stalePrLabel: 'Stale',
    closePrLabel: '',
    exemptPrLabels: '',
    onlyLabels: '',
    onlyIssueLabels: '',
    onlyPrLabels: '',
    anyOfLabels: '',
    anyOfIssueLabels: '',
    anyOfPrLabels: '',
    operationsPerRun: 30,
    removeStaleWhenUpdated: true,
    removeIssueStaleWhenUpdated: undefined,
    removePrStaleWhenUpdated: undefined,
    debugOnly: false,
    ascending: false,
    deleteBranch: false,
    startDate: undefined,
    exemptMilestones: '',
    exemptIssueMilestones: '',
    exemptPrMilestones: '',
    exemptAllMilestones: false,
    exemptAllIssueMilestones: undefined,
    exemptAllPrMilestones: undefined,
    exemptAssignees: '',
    exemptIssueAssignees: '',
    exemptPrAssignees: '',
    exemptAllAssignees: false,
    exemptAllIssueAssignees: undefined,
    exemptAllPrAssignees: undefined,
    enableStatistics: true,
    labelsToRemoveWhenStale: '',
    labelsToRemoveWhenUnstale: '',
    labelsToAddWhenUnstale: '',
    ignoreUpdates: false,
    ignoreIssueUpdates: undefined,
    ignorePrUpdates: undefined,
    exemptDraftPr: false,
    closeIssueReason: 'not_planned',
    includeOnlyAssigned: false,
    onlyMatchingFilter: []
  };
  return args;
}

function _getInputArgs(): Partial<IIssuesProcessorOptions> {
  const args: Partial<IIssuesProcessorOptions> = {
    repoToken: _toOptionalString('repo-token'),
    staleIssueMessage: _toOptionalString('stale-issue-message'),
    stalePrMessage: _toOptionalString('stale-pr-message'),
    closeIssueMessage: _toOptionalString('close-issue-message'),
    closePrMessage: _toOptionalString('close-pr-message'),
    daysBeforeStale: _toOptionalFloat('days-before-stale'),
    daysBeforeIssueStale: _toOptionalFloat('days-before-issue-stale'),
    daysBeforePrStale: _toOptionalFloat('days-before-pr-stale'),
    daysBeforeClose: _toOptionalInt('days-before-close'),
    daysBeforeIssueClose: _toOptionalInt('days-before-issue-close'),
    daysBeforePrClose: _toOptionalInt('days-before-pr-close'),
    staleIssueLabel: _toOptionalString('stale-issue-label'),
    closeIssueLabel: _toOptionalString('close-issue-label'),
    exemptIssueLabels: _toOptionalString('exempt-issue-labels'),
    stalePrLabel: _toOptionalString('stale-pr-label'),
    closePrLabel: _toOptionalString('close-pr-label'),
    exemptPrLabels: _toOptionalString('exempt-pr-labels'),
    onlyLabels: _toOptionalString('only-labels'),
    onlyIssueLabels: _toOptionalString('only-issue-labels'),
    onlyPrLabels: _toOptionalString('only-pr-labels'),
    anyOfLabels: _toOptionalString('any-of-labels'),
    anyOfIssueLabels: _toOptionalString('any-of-issue-labels'),
    anyOfPrLabels: _toOptionalString('any-of-pr-labels'),
    operationsPerRun: _toOptionalInt('operations-per-run'),
    removeStaleWhenUpdated: _toOptionalBoolean('remove-stale-when-updated'),
    removeIssueStaleWhenUpdated: _toOptionalBoolean(
      'remove-issue-stale-when-updated'
    ),
    removePrStaleWhenUpdated: _toOptionalBoolean(
      'remove-pr-stale-when-updated'
    ),
    debugOnly: _toOptionalBoolean('debug-only'),
    ascending: _toOptionalBoolean('ascending'),
    deleteBranch: _toOptionalBoolean('delete-branch'),
    startDate: _toOptionalString('start-date'),
    exemptMilestones: _toOptionalString('exempt-milestones'),
    exemptIssueMilestones: _toOptionalString('exempt-issue-milestones'),
    exemptPrMilestones: _toOptionalString('exempt-pr-milestones'),
    exemptAllMilestones: _toOptionalBoolean('exempt-all-milestones'),
    exemptAllIssueMilestones: _toOptionalBoolean('exempt-all-issue-milestones'),
    exemptAllPrMilestones: _toOptionalBoolean('exempt-all-pr-milestones'),
    exemptAssignees: _toOptionalString('exempt-assignees'),
    exemptIssueAssignees: _toOptionalString('exempt-issue-assignees'),
    exemptPrAssignees: _toOptionalString('exempt-pr-assignees'),
    exemptAllAssignees: _toOptionalBoolean('exempt-all-assignees'),
    exemptAllIssueAssignees: _toOptionalBoolean('exempt-all-issue-assignees'),
    exemptAllPrAssignees: _toOptionalBoolean('exempt-all-pr-assignees'),
    enableStatistics: _toOptionalBoolean('enable-statistics'),
    labelsToRemoveWhenStale: _toOptionalString('labels-to-remove-when-stale'),
    labelsToRemoveWhenUnstale: _toOptionalString(
      'labels-to-remove-when-unstale'
    ),
    labelsToAddWhenUnstale: _toOptionalString('labels-to-add-when-unstale'),
    ignoreUpdates: _toOptionalBoolean('ignore-updates'),
    ignoreIssueUpdates: _toOptionalBoolean('ignore-issue-updates'),
    ignorePrUpdates: _toOptionalBoolean('ignore-pr-updates'),
    exemptDraftPr: _toOptionalBoolean('exempt-draft-pr'),
    closeIssueReason: _toOptionalString('close-issue-reason'),
    includeOnlyAssigned: _toOptionalBoolean('include-only-assigned'),
    onlyMatchingFilter: _toOptionalStringArray('only-matching-filter')
  };
  return args;
}

function _getJSONArgs(json_config: string): Partial<IIssuesProcessorOptions> {
  const json: any = JSON.parse(json_config || '{}');
  const args: Partial<IIssuesProcessorOptions> = {};
  for (const key in json) {
    const newkey: string = key.replace(/([-_]\w)/g, g => g[1].toUpperCase());
    (args as any)[newkey] = json[key];
  }
  return args;
}

function _mergeArgs(
  into: IIssuesProcessorOptions,
  ...args: Partial<IIssuesProcessorOptions>[]
): IIssuesProcessorOptions {
  for (const inarg of args) {
    for (const k in inarg) {
      const key = k as keyof IIssuesProcessorOptions;
      const val: any = inarg[key];
      if (
        val == undefined ||
        (typeof val == 'number' && isNaN(val)) ||
        (typeof val == 'string' && val.length == 0)
      ) {
        continue;
      }
      (into as any)[key] = val;
    }
  }
  return into;
}

function _getAndValidateArgs(): IIssuesProcessorOptions {
  const default_args = _getDefaultArgs();
  const input_args = _getInputArgs();
  const json_args = _getJSONArgs(core.getInput('json-config'));

  const args: IIssuesProcessorOptions = _mergeArgs(
    default_args,
    input_args,
    json_args
  );
  console.log(args.onlyMatchingFilter);

  const new_omf: string[] = [];
  for (let term of args.onlyMatchingFilter) {
    if (term.search(/repo:|owner:|org:|user:/) < 0) {
      term = `repo:${context.repo.owner}/${context.repo.repo} ${term}`;
    }
    if (term.search(/is:open/) < 0) {
      term += ' is:open';
    }
    new_omf.push(term);
  }
  
  console.log({ "newomf": new_omf });

  args.onlyMatchingFilter = [];
  
  core.info(JSON.stringify(args, null, 2));

  for (const numberInput of [args.daysBeforeStale]) {
    if (isNaN(numberInput)) {
      const errorMessage = `Option "${numberInput}" did not parse to a valid float`;
      core.setFailed(errorMessage);
      throw new Error(errorMessage);
    }
  }

  for (const numberInput of [args.daysBeforeClose, args.operationsPerRun]) {
    if (isNaN(numberInput)) {
      const errorMessage = `Option "${numberInput}" did not parse to a valid integer`;
      core.setFailed(errorMessage);
      throw new Error(errorMessage);
    }
  }

  for (const optionalDateInput of [args.startDate || '']) {
    // Ignore empty dates because it is considered as the right type for a default value (so a valid one)
    if (optionalDateInput !== '') {
      if (!isValidDate(new Date(optionalDateInput))) {
        const errorMessage = `Option "${optionalDateInput}" did not parse to a valid date`;
        core.setFailed(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  const validCloseReasons = ['', 'completed', 'not_planned'];
  if (!validCloseReasons.includes(args.closeIssueReason)) {
    const errorMessage = `Unrecognized close-issue-reason "${
      args.closeIssueReason
    }", valid values are: ${validCloseReasons.filter(Boolean).join(', ')}`;
    core.setFailed(errorMessage);
    throw new Error(errorMessage);
  }

  return args;
}

async function processOutput(
  staledIssues: Issue[],
  closedIssues: Issue[]
): Promise<void> {
  core.setOutput('staled-issues-prs', JSON.stringify(staledIssues));
  core.setOutput('closed-issues-prs', JSON.stringify(closedIssues));
}

/**
 * @description
 * From an argument name, get the value as an optional boolean
 * This is very useful for all the arguments that override others
 * It will allow us to easily use the original one when the return value is `undefined`
 * Which is different from `true` or `false` that consider the argument as set
 *
 * @param {Readonly<string>} argumentName The name of the argument to check
 *
 * @returns {boolean | undefined} The value matching the given argument name
 */
function _toOptionalBoolean(
  argumentName: Readonly<string>
): boolean | undefined {
  const argument: string = core.getInput(argumentName);

  if (argument === 'true') {
    return true;
  } else if (argument === 'false') {
    return false;
  }

  return undefined;
}

/**
 * @description
 * From an argument name, get the value as an optional float
 * This is very useful for all the arguments that override others
 * It will allow us to easily use the original one when the return value is `undefined`
 *
 * @param {Readonly<string>} argumentName The name of the argument to check
 *
 * @returns {number | undefined} The value matching the given argument name
 */
function _toOptionalFloat(argumentName: Readonly<string>): number | undefined {
  const val = core.getInput(argumentName);
  return parseFloat(val) || undefined;
}

/**
 * @description
 * From an argument name, get the value as an optional int
 * This is very useful for all the arguments that override others
 * It will allow us to easily use the original one when the return value is `undefined`
 *
 * @param {Readonly<string>} argumentName The name of the argument to check
 *
 * @returns {number | undefined} The value matching the given argument name
 */
function _toOptionalInt(argumentName: Readonly<string>): number | undefined {
  const val = core.getInput(argumentName);
  return parseInt(val) || undefined;
}

/**
 * @description
 * From an argument name, get the value as an optional string
 * This is very useful for all the arguments that override others
 * It will allow us to easily use the original one when the return value is `undefined`
 *
 * @param {Readonly<string>} argumentName The name of the argument to check
 *
 * @returns {string | undefined} The value matching the given argument name
 */
function _toOptionalString(argumentName: Readonly<string>): string | undefined {
  const val = core.getInput(argumentName);
  return val || undefined;
}

/**
 * @description
 * From an argument name, get the value as an optional string array
 * This is very useful for all the arguments that override others
 * It will allow us to easily use the original one when the return value is `undefined`
 *
 * @param {Readonly<string>} argumentName The name of the argument to check
 *
 * @returns {string[] | undefined} The value matching the given argument name
 */
function _toOptionalStringArray(argumentName: Readonly<string>): string[] | undefined {
  const val = core.getInput(argumentName);
  if (!val) {
    return undefined;
  }
  try {
    return JSON.parse(val);
  } catch (err) {
    return [ val ];
  }
}

void _run();
