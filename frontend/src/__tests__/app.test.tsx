import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../app/providers/AuthContext';
import { VisionDataProvider } from '../app/providers/VisionDataContext';
import App from '../app/App';
import { Modal } from '../shared/components/Modal';
import Journaling from '../features/journaling/Journaling';
import RamadanCalendarCard from '../features/ramadan/RamadanCalendarCard';
import CalorieTrackerCard from '../features/calories/CalorieTrackerCard';

const renderWithDemo = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <VisionDataProvider demoMode={true}>{ui}</VisionDataProvider>
    </AuthProvider>
  );
};

describe('Frontend Features & Bug Fixes', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('generates unique aria-labelledby IDs for stacked modals', () => {
    render(
      <>
        <Modal open={true} onClose={() => {}} title="Parent Settings">
          <p>Parent content</p>
        </Modal>
        <Modal open={true} onClose={() => {}} title="Confirm Action">
          <p>Child content</p>
        </Modal>
      </>
    );

    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(2);
    const id1 = dialogs[0].getAttribute('aria-labelledby');
    const id2 = dialogs[1].getAttribute('aria-labelledby');
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('requires confirmation dialog before deleting a journal entry', async () => {
    const user = userEvent.setup();
    renderWithDemo(<Journaling />);

    expect(
      screen.getByText(/Reviewed quarterly priorities/i)
    ).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: /Delete entry/i });
    await user.click(deleteButtons[0]);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete Journal Entry')).toBeInTheDocument();

    // Entry still present until confirmed
    expect(
      screen.getByText(/Reviewed quarterly priorities/i)
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Reviewed quarterly priorities/i)
      ).not.toBeInTheDocument();
    });
  });

  it('renders 30-day Ramadan schedule, toggles fasted days, and adjusts Hijri offset', async () => {
    const user = userEvent.setup();
    renderWithDemo(<RamadanCalendarCard />);

    expect(screen.getByText(/3 \/ 30 days/i)).toBeInTheDocument();
    expect(screen.getByText('Moon sighting adjustment:')).toBeInTheDocument();

    // Toggle Day 4 fasted
    const day4Toggle = screen.getByRole('button', { name: 'Toggle fasted for Day 4' });
    await user.click(day4Toggle);
    expect(screen.getByText(/4 \/ 30 days/i)).toBeInTheDocument();

    // Adjust moon-sighting offset +1d
    await user.click(screen.getByRole('button', { name: '+1d' }));
    expect(screen.getByText('+1d', { selector: 'span' })).toBeInTheDocument();
  });

  it('logs quick-add preset calories, updates macro totals, and confirms delete', async () => {
    const user = userEvent.setup();
    renderWithDemo(<CalorieTrackerCard />);

    // Demo starts with 320 + 440 = 760 kcal logged
    expect(screen.getByText('760')).toBeInTheDocument();

    // Quick-add 2 Boiled Eggs (155 kcal)
    await user.click(screen.getByRole('button', { name: /2 Boiled Eggs/i }));
    expect(screen.getByText('915')).toBeInTheDocument();

    // Delete requires confirmation
    await user.click(screen.getByRole('button', { name: 'Delete 2 Boiled Eggs' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Remove Food Entry')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByText('760')).toBeInTheDocument();
    });
  });

  it('transitions Demo Mode to onboarding flow after erasing workspace data', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Enter Interactive Demo from LoginScreen (wait for AuthProvider init)
    const tryDemoBtn = await screen.findByRole('button', {
      name: /Try Interactive Demo/i,
    });
    await user.click(tryDemoBtn);

    expect(screen.getByText('Interactive Demo')).toBeInTheDocument();

    // Test Edit Mode card layout controls
    const editBtn = screen.getByRole('button', { name: /^Edit$/i });
    await user.click(editBtn);
    expect(screen.getByRole('button', { name: /Move Clock down/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Move Clock to Right col/i }));
    expect(
      screen.getByRole('button', { name: /Move Clock to Left col/i })
    ).toBeInTheDocument();

    // Open Settings -> Backup & Data -> Erase & restart setup
    await user.click(screen.getByRole('button', { name: 'Dashboard settings' }));
    const settingsDialog = await screen.findByRole('dialog');
    await user.click(within(settingsDialog).getByRole('button', { name: 'Backup & Data' }));
    await user.click(
      within(settingsDialog).getByRole('button', { name: /Erase & restart setup/i })
    );

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    await user.click(within(confirmDialog).getByRole('button', { name: 'Erase everything' }));

    await waitFor(() => {
      expect(screen.getByText('Personalize your workspace')).toBeInTheDocument();
    });
  });
});
