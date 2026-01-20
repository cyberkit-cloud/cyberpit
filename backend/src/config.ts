// Use a mutable object for configuration that can be updated at runtime
let config = {};
try {
  config = JSON.parse(process.env.CONFIGURATION || "{}");
} catch (error) {
  console.error("Error parsing CONFIGURATION environment variable:", error);
}

export const defaultConfig = {
  default: {
    type: "FAN-OUT",
    response: "INSTANT_200_OK", // "INSTANT_200_OK", // "ECHO_200_OK", "ECHO_400", "ECHO_500", "FASTEST_200_RESPONSE"
    // retry: {
    //   enabled: false,
    //   maxAttempts: 3,
    //   delayMs: 1000,
    //   backoffMultiplier: 2,
    //   retryOn: [500, 502, 503, 504], // Retry on these status codes
    // },
    endpoints: [
      // "https://1177.ngrok-free.app/webhook/stripe/stripeUpdates",
      // "https://85ae.ngrok-free.app/webhook/stripe/stripeUpdates"
    ],
  },
};

export const setConfig = (newConfig: any) => {
  config = newConfig;
};

export const getConfig = (): any => {
  return config;
};
