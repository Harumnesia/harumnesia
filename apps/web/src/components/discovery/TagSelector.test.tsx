// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { MAX_VISIBLE_OPTIONS, TagSelector } from './TagSelector.js';

const LARGE_TAXONOMY = Array.from(
  { length: 2_505 },
  (_, index) => `note-${String(index).padStart(4, '0')}`,
);

function TagSelectorHarness() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <TagSelector
      hint="Choose a canonical note."
      label="Production notes"
      onChange={setSelected}
      options={LARGE_TAXONOMY}
      selected={selected}
    />
  );
}

afterEach(cleanup);

describe('TagSelector production taxonomy behavior', () => {
  it('renders no large suggestion list until the user types', async () => {
    const user = userEvent.setup();
    render(<TagSelectorHarness />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);

    await user.type(screen.getByRole('textbox'), 'note');
    expect(screen.getAllByRole('button', { name: /^\+ note-/ })).toHaveLength(
      MAX_VISIBLE_OPTIONS,
    );
    expect(screen.getByText(/showing the first 10 matches/i)).not.toBeNull();
  });

  it('filters, selects the first visible result with Enter, and excludes it', async () => {
    const user = userEvent.setup();
    render(<TagSelectorHarness />);
    const input = screen.getByRole('textbox');

    await user.type(input, '2499');
    expect(screen.getAllByRole('button', { name: /^\+ note-/ })).toHaveLength(
      1,
    );
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: 'Remove note-2499' }),
    ).not.toBeNull();
    expect(screen.queryByRole('button', { name: '+ note-2499' })).toBeNull();

    await user.type(input, '2499');
    expect(screen.getByText('No matching options.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: '+ note-2499' })).toBeNull();

    await user.clear(input);
    await user.type(input, 'note');
    expect(screen.getAllByRole('button', { name: /^\+ note-/ })).toHaveLength(
      MAX_VISIBLE_OPTIONS,
    );
  });
});
