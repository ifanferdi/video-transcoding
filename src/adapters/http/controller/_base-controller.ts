import { UseCases } from '@/domain/use-cases/use-case.interface';
import asyncHandler from 'express-async-handler';

export default abstract class BaseController {
  constructor(protected useCases: UseCases) {}
}

export { asyncHandler };
