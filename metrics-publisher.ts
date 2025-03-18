import { SNSClient } from '@aws-sdk/client-sns'
import { randomUUID, type UUID } from 'crypto'
import {
	SnsMessagePublisher,
	tracePublish,
	type OnPublishFn,
} from './sns-message-publisher.ts'
import type {
	GenericMetricEvent,
	MultiMeasureMetricEvent,
	TeamMetricEvent,
} from './types.ts'

type PublishInputBase = {
	eventName: string
	timeMs?: number
}

export type SingleMeasurePublishInput = PublishInputBase & {
	value?: number
}

export type MultiMeasurePublishInput = PublishInputBase & {
	measures?: MultiMeasureMetricEvent['measures']
}

type PublishInputTypes = SingleMeasurePublishInput | MultiMeasurePublishInput

export type PublishInput = GenericMetricPublishInput | TeamMetricPublishInput

type TeamMetricPublishInput<U extends PublishInputTypes = PublishInputTypes> =
	U & TeamMetricEvent

export type GenericMetricPublishInput<
	U extends PublishInputTypes = PublishInputTypes,
> = U & {
	id?: UUID
}

/**
 * @module
 *
 * This module contains the MetricsPublisher class.
 */

/**
 * This class is to be used in other services as a means to publish metric events to the primary SNS topic.
 */
export class MetricsPublisher {
	private readonly DEFAULT_METRIC_EVENT_VALUE: number = 1
	private readonly messagePublisher: SnsMessagePublisher

	constructor(
		topicArn: string,
		snsClient: SNSClient = new SNSClient({}),
		enableRetry: boolean = true,
		maxAttempts: number = 3,
		private readonly onError: OnErrorFn = logError,
		private readonly onPublish: OnPublishFn = tracePublish,
	) {
		this.messagePublisher = new SnsMessagePublisher(
			topicArn,
			'MetricsEvent',
			enableRetry,
			maxAttempts,
			snsClient,
			this.onPublish,
		)
	}

	/**
	 * Publish MetricEvents to a SNS topic.
	 * @param args - Inputs used to construct the MetricEvent objects that are sent to the SNS topic.
	 * @throws Error if the SNS client fails to publish the MetricEvent.
	 */
	public async publish(...args: PublishInput[]) {
		try {
			const metricEvents = this.convert(...args)

			await this.messagePublisher.publish(...metricEvents)
		} catch (error) {
			if (error instanceof Error) {
				this.onError(error)
			} else {
				this.onError(
					new Error(
						`Error caught when attempting to publish metrics event(s) is not an instance of Error.`,
					),
				)
				throw error // This branch shouldn't get reached, but if it ever does for whatever reason, we don't want to just swallow the error.
			}
		}
	}

	/**
	 * Convert the to-be-published input arguments into MetricEvent types that SNS consumes.
	 * @param publishInputs - Publish input arguments.
	 * @returns Mapped array of MetricEvents.
	 */
	private convert(
		...publishInputs: PublishInput[]
	): (TeamMetricEvent | GenericMetricEvent)[] {
		return publishInputs.map((publishInput) => {
			const measurePayload = this.convertMeasure(publishInput)
			const timeMs = publishInput.timeMs ?? Date.now()
			if ('teamId' in publishInput) {
				return { ...publishInput, ...measurePayload, timeMs }
			} else {
				return {
					...publishInput,
					...measurePayload,
					id: publishInput.id ?? randomUUID(),
					timeMs,
				}
			}
		})
	}

	/**
	 * Convert either the single or multi measure object structure.
	 * @param publishInput - Publish input.
	 * @returns Partial measure object in either TeamMetricEvent or GenericMetricEvent
	 */
	private convertMeasure(publishInput: PublishInput) {
		let result

		if ('measures' in publishInput && publishInput.measures) {
			result = {
				measures: publishInput.measures,
			}
		} else if ('value' in publishInput) {
			result = {
				value: publishInput.value ?? this.DEFAULT_METRIC_EVENT_VALUE,
			}
		} else {
			result = {
				value: this.DEFAULT_METRIC_EVENT_VALUE,
			}
		}

		return result
	}
}

export type OnErrorFn = (error: Error) => void
export const logError: OnErrorFn = (error) =>
	console.error(
		`Error when attempting to publish metrics event(s): ${error.message}`,
	)
