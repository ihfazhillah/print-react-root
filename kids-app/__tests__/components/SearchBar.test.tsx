import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from '../../src/components/SearchBar';

test('renders a text input', () => {
  const onSearch = jest.fn();
  const { getByLabelText } = render(<SearchBar onSearch={onSearch} />);

  expect(getByLabelText('Search images')).toBeTruthy();
});

test('calls onSearch when typing', () => {
  const onSearch = jest.fn();
  const { getByLabelText } = render(<SearchBar onSearch={onSearch} />);

  fireEvent.changeText(getByLabelText('Search images'), 'cat');

  expect(onSearch).toHaveBeenCalledWith('cat');
});

test('clear button resets input and calls onSearch with empty string', () => {
  const onSearch = jest.fn();
  const { getByLabelText } = render(<SearchBar onSearch={onSearch} />);

  fireEvent.changeText(getByLabelText('Search images'), 'cat');
  onSearch.mockClear();

  fireEvent.press(getByLabelText('Clear search'));

  expect(onSearch).toHaveBeenCalledWith('');
});

test('clear button is not visible when input is empty', () => {
  const onSearch = jest.fn();
  const { queryByLabelText } = render(<SearchBar onSearch={onSearch} />);

  expect(queryByLabelText('Clear search')).toBeNull();
});
