export interface ClientDisplayValue {
  clientId: string;
  clientName: string;
  friendlyId?: string;
}

export function clientDisplayId(client: ClientDisplayValue): string {
  return client.friendlyId?.trim() || client.clientId;
}

export function formatClientDisplay(value: string | ClientDisplayValue | null | undefined): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  const id = clientDisplayId(value);
  const name = value.clientName.trim();

  return name ? `${id} - ${name}` : id;
}
