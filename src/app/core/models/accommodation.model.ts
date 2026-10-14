export interface Accommodation {
  id: string;
  name: string;
  country: string;
  city: string;
  /** Valeurs du catalogue : 'Hotel', 'Maison', 'Camping'. */
  type: string;
  pricePerNight: number;
  stars: number;
  image: string;
  /** Dates ISO (AAAA-MM-JJ). */
  availableFrom: string;
  availableTo: string;
}
