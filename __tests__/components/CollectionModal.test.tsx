import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { CollectionModal } from '../../components/CollectionModal'

jest.mock('../../hooks/useCollections', () => ({
  useCollections: jest.fn(() => ({
    getCollections: jest.fn().mockResolvedValue([
      { id: 'c1', user_id: 'u1', name: 'Tokyo Faves' },
    ]),
    createCollection: jest.fn().mockResolvedValue({ id: 'c2', user_id: 'u1', name: 'New List' }),
  })),
}))

describe('CollectionModal', () => {
  it('renders existing collections on open', async () => {
    const { getByText } = render(
      <CollectionModal visible onClose={jest.fn()} onSelect={jest.fn()} />
    )
    await waitFor(() => expect(getByText('Tokyo Faves')).toBeTruthy())
  })

  it('calls onSelect with collection id when tapped', async () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <CollectionModal visible onClose={jest.fn()} onSelect={onSelect} />
    )
    await waitFor(() => fireEvent.press(getByText('Tokyo Faves')))
    expect(onSelect).toHaveBeenCalledWith('c1', 'Tokyo Faves')
  })

  it('creates new collection and calls onSelect', async () => {
    const onSelect = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <CollectionModal visible onClose={jest.fn()} onSelect={onSelect} />
    )
    await waitFor(() => {})
    fireEvent.changeText(getByPlaceholderText('Collection name'), 'New List')
    fireEvent.press(getByText('Create'))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('c2', 'New List'))
  })
})
