import { EvaluatedArgs } from '../expressions/args';
import { expect } from '@glimmer/util';
import { Tag, Reference, ConstReference, ReferenceIterator, IterationArtifacts } from '@glimmer/reference';
import { APPEND_OPCODES, Op as Op } from '../../opcodes';

class IterablePresenceReference implements Reference<boolean> {
  public tag: Tag;
  private artifacts: IterationArtifacts;

  constructor(artifacts: IterationArtifacts) {
    this.tag = artifacts.tag;
    this.artifacts = artifacts;
  }

  value(): boolean {
    return !this.artifacts.isEmpty();
  }
}

APPEND_OPCODES.add(Op.PutIterator, vm => {
  let listRef = vm.frame.getOperand();
  let args = expect(vm.frame.getArgs(), 'PutIteratorOpcode expects a populated args register');
  let iterable = vm.env.iterableFor(listRef, args);
  let iterator = new ReferenceIterator(iterable);

  vm.frame.setIterator(iterator);
  vm.frame.setCondition(new IterablePresenceReference(iterator.artifacts));
});

APPEND_OPCODES.add(Op.EnterList, (vm, { op1: _slice }) => {
  vm.enterList(vm.constants.getSlice(_slice));
});

APPEND_OPCODES.add(Op.ExitList, vm => vm.exitList());

APPEND_OPCODES.add(Op.StartIterate, (vm, { op2: _slice }) => {
  let key = expect(vm.frame.getKey(), 'EnterWithKeyOpcode expects a populated key register');
  let slice = vm.constants.getSlice(_slice);
  vm.enterWithKey(key, slice);
});

const TRUE_REF = new ConstReference(true);
const FALSE_REF = new ConstReference(false);

APPEND_OPCODES.add(Op.Iterate, (vm, { op1: end }) => {
  let item = vm.frame.getIterator().next();

  if (item) {
    vm.frame.setCondition(TRUE_REF);
    vm.frame.setKey(item.key);
    vm.frame.setOperand(item.value);
    vm.frame.setArgs(EvaluatedArgs.positional([item.value, item.memo]));
  } else {
    vm.frame.setCondition(FALSE_REF);
    vm.goto(end);
  }
});