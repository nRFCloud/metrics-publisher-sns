import type { UUID } from 'node:crypto'

/**
 * Base type for all metric events.
 */
type MetricEventBase = {
	/**
	 * The name of the event.
	 */
	eventName: string
	/**
	 * The time the event occurred in milliseconds since the epoch.
	 */
	timeMs?: number
}

/**
 * A metric event with a single numerical value.
 */
type SingleMeasureMetricEvent = MetricEventBase & {
	/**
	 * The numerical value of the metric.
	 */
	value: number
}

/**
 * A metric event with multiple named measures, each of which can be a number or a string.
 */
export type MultiMeasureMetricEvent = MetricEventBase & {
	/**
	 * An object containing named measures.
	 * Each measure can be a number or a string.
	 */
	measures: {
		[name: string]: number | string
	}
}

/**
 * Union type for all single or multi measure metric events.
 */
type MetricEventTypes = SingleMeasureMetricEvent | MultiMeasureMetricEvent

/**
 * A team metric event is an event under the context of a team.
 * e.g. devices in a team sending messages, adding devices to a team, upgrading a team plan, etc.
 */
export type TeamMetricEvent<T extends MetricEventTypes = MetricEventTypes> =
	T & {
		/**
		 * The unique identifier of the team.
		 */
		teamId: UUID
	}

/**
 * A generic metric event is an event independent of a team.
 * e.g. user logging in
 */
export type GenericMetricEvent<T extends MetricEventTypes = MetricEventTypes> =
	T & {
		/**
		 * Unique identifier for this specific event.
		 */
		id: UUID
	}

/**
 * Union type for all metric events, either team-specific or generic.
 */
export type MetricEvent<T extends MetricEventTypes = MetricEventTypes> =
	| TeamMetricEvent<T>
	| GenericMetricEvent<T>
