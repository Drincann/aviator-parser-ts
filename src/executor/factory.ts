import { PendingExecution, ExpressionRuntime } from './types';
import { Expr, Node } from '../ast';
import { TokenType } from '../token';
import { Pratt } from '../parser';
import { 
    AndExecution, 
    OrExecution, 
    NotExecution, 
    ConditionalExecution, 
    ValueExecution 
} from './impl';

export class AviatorPendingExecutionFactory {

    public static build(runtime: ExpressionRuntime, expression: Expr): PendingExecution {
        if (expression instanceof Node) {
            const node = expression as Node;
            if (node.operator.type === TokenType.LOGIC_AND) {
                const children = node.getChildren();
                return new AndExecution(
                    AviatorPendingExecutionFactory.build(runtime, children[0]),
                    AviatorPendingExecutionFactory.build(runtime, children[1])
                );
            }

            if (node.operator.type === TokenType.LOGIC_OR) {
                const children = node.getChildren();
                return new OrExecution(
                    AviatorPendingExecutionFactory.build(runtime, children[0]),
                    AviatorPendingExecutionFactory.build(runtime, children[1])
                );
            }

            if (node.operator.type === TokenType.LOGIC_NOT) {
                const children = node.getChildren();
                return new NotExecution(
                    AviatorPendingExecutionFactory.build(runtime, children[0])
                );
            }

            if (node.operator.type === TokenType.CONDITIONAL) {
                const children = node.getChildren();
                return new ConditionalExecution(
                    AviatorPendingExecutionFactory.build(runtime, children[0]),
                    AviatorPendingExecutionFactory.build(runtime, children[1]),
                    AviatorPendingExecutionFactory.build(runtime, children[2])
                );
            }
        }

        return new ValueExecution(runtime, expression);
    }

    public static compile(runtime: ExpressionRuntime, expression: string): PendingExecution {
        return AviatorPendingExecutionFactory.build(runtime, Pratt.parse(expression));
    }
}

