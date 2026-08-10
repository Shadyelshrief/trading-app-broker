import { selectActiveDropdownOptionOnTab } from './dropdown-tab-selection.service';

describe('selectActiveDropdownOptionOnTab', () => {
  afterEach(() => {
    document.querySelectorAll('[data-dropdown-tab-test]').forEach((element) => element.remove());
  });

  it('commits the active Material option when Tab is pressed', () => {
    const panel = document.createElement('div');
    panel.className = 'mat-mdc-select-panel';
    panel.dataset['dropdownTabTest'] = 'true';
    const option = document.createElement('div');
    option.className = 'mat-mdc-option mat-mdc-option-active';
    panel.appendChild(option);
    document.body.appendChild(panel);
    const click = spyOn(option, 'click');

    const selected = selectActiveDropdownOptionOnTab(new KeyboardEvent('keydown', { key: 'Tab' }), document);

    expect(selected).toBeTrue();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('commits the first enabled option when no autocomplete option is active yet', () => {
    const panel = document.createElement('div');
    panel.className = 'mat-mdc-autocomplete-panel';
    panel.dataset['dropdownTabTest'] = 'true';
    const option = document.createElement('div');
    option.className = 'mat-mdc-option';
    panel.appendChild(option);
    document.body.appendChild(panel);
    const click = spyOn(option, 'click');

    expect(selectActiveDropdownOptionOnTab(new KeyboardEvent('keydown', { key: 'Tab' }), document)).toBeTrue();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('does not select disabled options or react to other keys', () => {
    const panel = document.createElement('div');
    panel.className = 'mat-mdc-autocomplete-panel';
    panel.dataset['dropdownTabTest'] = 'true';
    const option = document.createElement('div');
    option.className = 'mat-mdc-option mat-mdc-option-active';
    option.setAttribute('aria-disabled', 'true');
    panel.appendChild(option);
    document.body.appendChild(panel);
    const click = spyOn(option, 'click');

    expect(selectActiveDropdownOptionOnTab(new KeyboardEvent('keydown', { key: 'Tab' }), document)).toBeFalse();
    expect(selectActiveDropdownOptionOnTab(new KeyboardEvent('keydown', { key: 'Enter' }), document)).toBeFalse();
    expect(click).not.toHaveBeenCalled();
  });
});
