export interface Tour {
  id: string;
  title: string;
  country: string;
  continent: string;
  /** Prix en euros, « à partir de ». */
  price: number;
  /** Durée en jours. */
  duration: number;
  image: string;
  description: string;
  /** Un élément par jour. */
  itinerary: string[];
  accommodationId: string;
}
