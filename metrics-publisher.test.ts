import type { SNSClient } from '@aws-sdk/client-sns'
import assert from 'node:assert'
import { describe, it, mock } from 'node:test'
import {
	MetricsPublisher,
	type GenericMetricPublishInput,
	type MultiMeasurePublishInput,
	type PublishInput,
	type SingleMeasurePublishInput,
} from './metrics-publisher.ts'
import type { TeamMetricEvent } from './types.ts'

enum EventNames {
	AGPS_FILE_SIZE_FETCHED = 'AgpsFileSizeFetched',
	CELL_LOCATION_REQUEST_PROCESSED = 'CellLocationRequestProcessed',
	GROUND_FIX_LOCATION_REQUEST_PROCESSED = 'GroundFixLocationRequestProcessed',
	PGPS_CLIENT_REQUEST_PROCESSED = 'PgpsClientRequestProcessed',
	SOME_GENERIC_EVENT = 'SomeGenericEvent',
}

void describe('Metrics publisher test', () => {
	void it('should retry if publishing to SNS fails', async () => {
		const mockSend = mock.fn<SNSClient['send']>()
		mockSend.mock.mockImplementationOnce(
			async () => Promise.reject(new Error('SomeError')),
			0,
		)
		mockSend.mock.mockImplementationOnce(async () => Promise.resolve(), 1)
		const publisher = new MetricsPublisher(
			'SomeArn',
			{
				send: mockSend,
			} as any,
			undefined,
			undefined,
			() => undefined,
			() => undefined,
		)
		await publisher.publish({
			eventName: EventNames.SOME_GENERIC_EVENT,
			timeMs: Date.now(),
		})
		assert.equal(mockSend.mock.callCount(), 2)
	})

	void it('should publish single measure generic events', async () => {
		const events: PublishInput[] = [
			{
				eventName: EventNames.SOME_GENERIC_EVENT,
				timeMs: Date.now(),
			},
			{
				eventName: EventNames.SOME_GENERIC_EVENT,
				timeMs: Date.now(),
			},
			{
				eventName: EventNames.SOME_GENERIC_EVENT,
				timeMs: Date.now(),
			},
		]
		const mockSend = mock.fn<SNSClient['send']>(async () => Promise.resolve())
		const publisher = new MetricsPublisher(
			'SomeArn',
			{
				send: mockSend,
			} as any,
			undefined,
			undefined,
			() => undefined,
			() => undefined,
		)
		await publisher.publish(...events)
		assert.equal(mockSend.mock.callCount(), 1)

		const event: GenericMetricPublishInput<SingleMeasurePublishInput> = {
			eventName: EventNames.AGPS_FILE_SIZE_FETCHED,
		}
		await publisher.publish(event)
		assert.equal(mockSend.mock.callCount(), 2)
	})

	void it('should publish multi-measure generic events', async () => {
		const event1: GenericMetricPublishInput<MultiMeasurePublishInput> = {
			eventName: EventNames.AGPS_FILE_SIZE_FETCHED,
			measures: undefined,
		}
		const event2: GenericMetricPublishInput<MultiMeasurePublishInput> = {
			eventName: EventNames.AGPS_FILE_SIZE_FETCHED,
			measures: { measure1: '1', measure2: 2 },
		}
		const mockSend = mock.fn<SNSClient['send']>(async () => Promise.resolve())
		const publisher = new MetricsPublisher(
			'SomeArn',
			{
				send: mockSend,
			} as any,
			undefined,
			undefined,
			() => undefined,
			() => undefined,
		)
		await publisher.publish(event1, event2)
		assert.equal(mockSend.mock.callCount(), 1)
	})

	void it('should publish team metrics', async () => {
		const teamId =
			'12345e6f-8e12-49bd-9789-b807608ad3c2' as TeamMetricEvent['teamId']
		const commonTeamInfo = {
			planType: 'DEVELOPER',
			context: {
				name: 'Device',
				value: '88124e6f-8e12-49bd-9789-b807608ad3c2',
			},
			sourceApi: 'COAP',
			teamId,
		}
		const events: PublishInput[] = [
			{
				eventName: EventNames.AGPS_FILE_SIZE_FETCHED,
				timeMs: Date.now(),
				...commonTeamInfo,
			},
			{
				eventName: EventNames.PGPS_CLIENT_REQUEST_PROCESSED,
				timeMs: Date.now(),
				...commonTeamInfo,
			},
			{
				eventName: EventNames.GROUND_FIX_LOCATION_REQUEST_PROCESSED,
				timeMs: Date.now(),
				...commonTeamInfo,
				measures: {
					A: 1,
				},
			},
			{
				eventName: EventNames.CELL_LOCATION_REQUEST_PROCESSED,
				teamId: commonTeamInfo.teamId,
			},
		]
		const mockSend = mock.fn<SNSClient['send']>(async () => Promise.resolve())
		const publisher = new MetricsPublisher(
			'SomeArn',
			{
				send: mockSend,
			} as any,
			undefined,
			undefined,
			() => undefined,
			() => undefined,
		)
		await publisher.publish(...events)
		assert.equal(mockSend.mock.callCount(), 1)
	})
})
