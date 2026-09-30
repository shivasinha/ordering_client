import * as dayjs from 'dayjs';
import * as advancedFormat from 'dayjs/plugin/advancedFormat';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import * as duration from 'dayjs/plugin/duration';
import * as isBetween from 'dayjs/plugin/isBetween';
import * as isToday from 'dayjs/plugin/isToday';
import * as isoWeek from 'dayjs/plugin/isoWeek';
import * as localeData from 'dayjs/plugin/localeData';
import * as localizedFormat from 'dayjs/plugin/localizedFormat';
import * as utc from 'dayjs/plugin/utc';
import * as weekday from 'dayjs/plugin/weekday';
import * as isSameOrAfter  from 'dayjs/plugin/isSameOrAfter';

// This file is used only in unit tests, to make sure that all plugin typings are correctly loaded.
// All module declarations are merged here and then picked up by the tsconfig.spec.json file.

declare module 'dayjs' {}
