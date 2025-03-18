# `@nrfcloud/metrics-publisher-sns`

<https://jsr.io/@nrfcloud/metrics-publisher-sns>

The metrics publisher library offers a class that can be used by other services
to streamline the process of pushing events to a SNS topic.

## Usage

Install the package from JSR:

```bash
npx jsr add @nrfcloud/metrics-publisher-sns
```

Use in your code:

```typescript
import { MetricsPublisher } from "@nrfcloud/metrics-publisher-sns";
const publisher = new MetricsPublisher("topicArn");
await publisher.publish({
  eventName: "my-event-name",
});
```
