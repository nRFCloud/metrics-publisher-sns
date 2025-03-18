import type { SNSClient } from '@aws-sdk/client-sns'
import assert from 'node:assert'
import { describe, it, mock } from 'node:test'
import { SnsMessagePublisher } from './sns-message-publisher.ts'

const maxRetryAttempts = 3

void describe('SnsMessagePublisher', () => {
	void it('should publish messages', async () => {
		const mockSend = mock.fn<SNSClient['send']>(async () => Promise.resolve({}))
		const messagePublisher = new SnsMessagePublisher(
			'SomeTopicArn',
			'SomeMessageAttribute',
			undefined,
			undefined,
			{
				send: mockSend,
			} as any,
			() => undefined,
		)
		const messages = [
			{ id: 'A', value: 1 },
			{ id: 'B', value: 2 },
		]
		await messagePublisher.publish(...messages)
		assert.equal(mockSend.mock.callCount(), 1)
	})

	void it('should retry publishing on error', async () => {
		const mockSend = mock.fn<SNSClient['send']>(async () =>
			Promise.reject(new Error('SomeError')),
		)
		const messagePublisher = new SnsMessagePublisher(
			'SomeTopicArn',
			'SomeMessageAttribute',
			undefined,
			undefined,
			{
				send: mockSend,
			} as any,
			() => undefined,
		)
		const messages = [
			{ id: 'A', value: 1 },
			{ id: 'B', value: 2 },
		]
		try {
			await messagePublisher.publish(...messages)
		} catch {}
		assert.equal(mockSend.mock.callCount(), maxRetryAttempts)
	})
})
