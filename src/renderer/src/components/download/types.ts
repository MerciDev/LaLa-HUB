export { MetadataProvider, GameMetadata } from '../../../../shared/types'

export function emptyMetadata(title: string): GameMetadata {
  return {
    title,
    screenshots: [],
    platforms: [],
    genres: [],
    developers: [],
    publishers: []
  }
}
