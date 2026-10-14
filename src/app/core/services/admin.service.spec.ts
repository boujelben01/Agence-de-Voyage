import { AccommodationInput, TourInput, toAccommodationDocument, toTourDocument } from './admin.service';

describe('documents écrits par AdminService', () => {
  it("n'écrit jamais le champ id d'un circuit, même s'il est présent dans l'objet reçu", () => {
    const withId = {
      id: '42',
      title: 'Romance à Paris',
      country: 'France',
      continent: 'Europe',
      price: 980,
      duration: 2,
      image: 'images/paris.jpg',
      description: 'Un séjour.',
      itinerary: ['Jour un', 'Jour deux'],
      accommodationId: '1',
      extra: 'ne doit pas passer',
    } as unknown as TourInput;

    const document = toTourDocument(withId);
    expect(Object.keys(document).sort()).toEqual([
      'accommodationId',
      'continent',
      'country',
      'description',
      'duration',
      'image',
      'itinerary',
      'price',
      'title',
    ]);
    expect('id' in document).toBe(false);
  });

  it('copie l’itinéraire pour ne pas partager le tableau', () => {
    const input: TourInput = {
      title: 'T',
      country: 'France',
      continent: 'Europe',
      price: 1,
      duration: 1,
      image: 'images/x.jpg',
      description: 'D',
      itinerary: ['a'],
      accommodationId: '1',
    };
    const document = toTourDocument(input);
    expect(document.itinerary).toEqual(['a']);
    expect(document.itinerary).not.toBe(input.itinerary);
  });

  it("n'écrit jamais le champ id d'un hébergement", () => {
    const withId = {
      id: '7',
      name: 'Hôtel du Louvre',
      country: 'France',
      city: 'Paris',
      type: 'Hotel',
      pricePerNight: 121,
      stars: 4,
      image: 'images/hotellouvre.jpg',
      availableFrom: '2026-01-01',
      availableTo: '2027-12-31',
    } as unknown as AccommodationInput;

    const document = toAccommodationDocument(withId);
    expect('id' in document).toBe(false);
    expect(document.name).toBe('Hôtel du Louvre');
    expect(Object.keys(document)).toHaveLength(9);
  });
});
