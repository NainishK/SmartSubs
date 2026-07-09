// Types for the public (no-auth) landing page API responses

export interface PublicMediaItem {
    id: number;
    media_type: 'movie' | 'tv';
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number | null;
    overview: string | null;
    genre_ids: number[];
    original_language: string | null;
    release_date: string | null;
    providers: { name: string; logo: string | null }[];
}
