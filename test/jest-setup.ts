// Configuration Jest pour les tests E2E
// Augmente le timeout global pour les tests qui peuvent prendre plus de temps
jest.setTimeout(30000);

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test';