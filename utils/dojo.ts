// Dojo API utility functions

const API_BASE_URL = 'https://sp237211ogbloc1.connect.paymentsense.cloud';

interface Money {
  value: number;
  currencyCode: string;
}

export interface CreatePaymentIntentRequest {
  amount: Money;
  reference: string;
}

export interface CreatePaymentIntentResponse {
  id: string;
}

export interface CreateTerminalSessionRequest {
  terminalId: string;
  details: {
    sale: {
      paymentIntentId: string;
    };
    sessionType: 'Sale';
  };
}

export interface TerminalSessionStatusResponse {
  status: 'InitiateRequested' | 'Initiated' | 'Processing' | 'Captured' | 'Failed' | 'Expired' | 'Canceled' | 'CancelRequested' | 'SignatureVerificationRequired' | 'SignatureVerificationAccepted' | 'SignatureVerificationRejected' | 'PleaseWait' | 'EnterPin' | 'RemoveCard' | 'PresentCard' | 'CardStuck';
}

export const createDojoPaymentIntent = async (
  apiKey: string,
  amount: number,
  reference: string
): Promise<CreatePaymentIntentResponse> => {
  const response = await fetch(`${API_BASE_URL}/payment-intents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${apiKey}`,
      version: '2024-02-05',
    },
    body: JSON.stringify({
      amount: {
        value: Math.round(amount * 100), // Convert to pence
        currencyCode: 'GBP',
      },
      reference,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Dojo payment intent: ${error.errors ? JSON.stringify(error.errors) : response.statusText}`);
  }

  return response.json();
};

export const createDojoTerminalSession = async (
  apiKey: string,
  terminalId: string,
  paymentIntentId: string,
  softwareHouseId: string,
  resellerId: string
): Promise<{ id: string }> => {
  const response = await fetch(`${API_BASE_URL}/terminal-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${apiKey}`,
      version: '2024-02-05',
      'software-house-id': softwareHouseId,
      'reseller-id': resellerId,
    },
    body: JSON.stringify({
      terminalId,
      details: {
        sale: {
          paymentIntentId,
        },
        sessionType: 'Sale',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Dojo terminal session: ${error.errors ? JSON.stringify(error.errors) : response.statusText}`);
  }

  return response.json();
};

export const getDojoTerminalSessionStatus = async (
    apiKey: string,
    terminalSessionId: string,
    softwareHouseId: string,
    resellerId: string
): Promise<TerminalSessionStatusResponse> => {
    const response = await fetch(`${API_BASE_URL}/terminal-sessions/${terminalSessionId}`, {
        headers: {
            Authorization: `Basic ${apiKey}`,
            version: '2024-02-05',
            'software-house-id': softwareHouseId,
            'reseller-id': resellerId,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get Dojo terminal session status: ${error.errors ? JSON.stringify(error.errors) : response.statusText}`);
    }

    return response.json();
};
