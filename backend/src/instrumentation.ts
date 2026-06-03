import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

// OpenTelemetry Prometheus metrics exporter serving on port 9464
const prometheusExporter = new PrometheusExporter({
  port: 9464,
});

const sdk = new NodeSDK({
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // FS telemetry is extremely verbose; disable to optimize memory performance
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req: any) => {
          // Avoid instrumenting health and metrics checks
          return req.url?.includes('/health') || req.url?.includes('/metrics');
        },
      },
    }),
  ],
});

try {
  sdk.start();
  console.log('APEX Observability: OpenTelemetry Node SDK initialized.');
  console.log(
    'Prometheus metrics active for scraping at: http://localhost:9464/metrics',
  );
} catch (err: any) {
  console.error('Failed to initialize OpenTelemetry SDK:', err);
}

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK gracefully terminated.'))
    .catch((err) => console.error('Error during OTel SDK termination:', err))
    .finally(() => process.exit(0));
});
