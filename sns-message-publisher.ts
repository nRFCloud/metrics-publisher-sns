import {
	PublishBatchCommand,
	SNSClient,
	type PublishBatchRequestEntry,
} from '@aws-sdk/client-sns'
import { waitForIt } from '@nrfcloud/wait-for-it'
import { randomUUID } from 'crypto'
import { chunk } from 'lodash-es'

/**
 * Base class for publishing messages to SNS.
 * Extend this class for consistency when publishing messages to the primary SNS topic:
 * - The "name" attribute is used across services to filter the type of message.
 * - The message body should contain the stringified JSON.
 */
export class SnsMessagePublisher {
	private readonly MAX_SNS_MESSAGE_PUBLISH_SIZE = 10 // AWS imposed limit.

	constructor(
		private readonly topicArn: string,
		private readonly messageAttributeName: string,
		private readonly enableRetry: boolean = true,
		private readonly maxAttempts: number = 3,
		private readonly sns = new SNSClient({}),
		private readonly onBatchPublish: OnPublishFn = tracePublish,
	) {}

	/**
	 * Batch publishes messages to an SNS topic.
	 * @param messages - Messages to send.
	 */
	async publish(...messages: Record<string, any>[]) {
		const snsEventEntries: PublishBatchRequestEntry[] = messages.map(
			(message) => ({
				Id: randomUUID(),
				Message: JSON.stringify(message),
				MessageAttributes: {
					name: {
						DataType: 'String',
						StringValue: this.messageAttributeName,
					},
				},
			}),
		)
		await this.batchPublish(snsEventEntries)
	}

	protected async batchPublish(snsEventEntries: PublishBatchRequestEntry[]) {
		for (const subset of chunk(
			snsEventEntries,
			this.MAX_SNS_MESSAGE_PUBLISH_SIZE,
		)) {
			const payload = {
				PublishBatchRequestEntries: subset,
				TopicArn: this.topicArn,
			}

			await (this.enableRetry
				? waitForIt(
						async () => this.sns.send(new PublishBatchCommand(payload)),
						this.maxAttempts,
					)
				: this.sns.send(new PublishBatchCommand(payload)))

			this.onBatchPublish(subset)
		}
	}
}

/**
 * Function to handle the publishing of a batch of messages.
 * This function is called after a batch of messages has been published to SNS.
 */
export type OnPublishFn = (subset: PublishBatchRequestEntry[]) => void

/**
 * Default publish handler that traces the published batch to the console.
 */
export const tracePublish: OnPublishFn = (subset) =>
	console.trace(`Published batch to SNS: ${JSON.stringify(subset)}`)
