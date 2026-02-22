import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrintButton } from '../../src/components/PrintButton';

const defaultProps = {
  onPrint: jest.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  reset: jest.fn(),
};

test('shows Print label in idle state', () => {
  const { getByText } = render(<PrintButton {...defaultProps} />);
  expect(getByText('Print')).toBeTruthy();
});

test('disables and shows spinner when pending', () => {
  const { queryByText } = render(<PrintButton {...defaultProps} isPending={true} />);
  expect(queryByText('Print')).toBeNull();
});

test('shows success message when print succeeds', () => {
  const { getByText } = render(<PrintButton {...defaultProps} isSuccess={true} />);
  expect(getByText('Sent to printer!')).toBeTruthy();
});

test('shows error message with retry button', () => {
  const onPrint = jest.fn();
  const { getByText } = render(
    <PrintButton
      {...defaultProps}
      isError={true}
      error={new Error('Print failed')}
      onPrint={onPrint}
    />,
  );

  expect(getByText('Print failed')).toBeTruthy();
  fireEvent.press(getByText('Try Again'));
  expect(onPrint).toHaveBeenCalledTimes(1);
});
