import { clientDisplayId, formatClientDisplay } from './client-display.util';

describe('client display utilities', () => {
  const client = {
    clientId: '9fe74f42-0d89-49c7-972f-4ecb1ef1a579',
    friendlyId: '29',
    clientName: 'Khalid Badry'
  };

  it('uses the friendly ID instead of the internal UUID', () => {
    expect(clientDisplayId(client)).toBe('29');
    expect(formatClientDisplay(client)).toBe('29 - Khalid Badry');
  });

  it('falls back to the internal ID when a friendly ID is unavailable', () => {
    expect(formatClientDisplay({ clientId: 'client-1', clientName: 'Nanis Mohamed' })).toBe(
      'client-1 - Nanis Mohamed'
    );
  });

  it('preserves typed search text', () => {
    expect(formatClientDisplay('29')).toBe('29');
  });
});
